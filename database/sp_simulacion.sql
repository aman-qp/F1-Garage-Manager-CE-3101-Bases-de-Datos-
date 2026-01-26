USE F1GarageManager;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SimularCarrera
  @id_circuito INT,
  @dc_global  DECIMAL(10,2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  -- Validación básica de DC
  IF @dc_global <= 0
    THROW 50001, 'dc_global debe ser mayor a 0', 1;

  BEGIN TRAN;
  BEGIN TRY

    /* =========================================================
       Validaciones previas
       ========================================================= */
    IF NOT EXISTS (SELECT 1 FROM dbo.CIRCUITO WHERE id_circuito = @id_circuito)
      THROW 50002, 'El circuito no existe', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.CARRO WHERE estado = 'Finalizado')
      THROW 50003, 'No hay carros finalizados para simular', 1;

    -- Datos del circuito
    DECLARE @distancia_total DECIMAL(10,2);
    DECLARE @cantidad_curvas INT;

    SELECT
      @distancia_total = distancia_total,
      @cantidad_curvas = cantidad_curvas
    FROM dbo.CIRCUITO
    WHERE id_circuito = @id_circuito;

    -- Distancias
    DECLARE @Dcurvas  DECIMAL(10,2) = @cantidad_curvas * @dc_global;
    DECLARE @Drectas  DECIMAL(10,2) = @distancia_total - @Dcurvas;

    -- Validación: Drectas >= 0
    -- OJO: si cantidad_curvas = 0, no debe intentar dividir entre 0 en el mensaje.
    IF @Drectas < 0
    BEGIN
      DECLARE @max_dc DECIMAL(10,4) = @distancia_total / NULLIF(@cantidad_curvas, 0);
      DECLARE @ErrorMsg NVARCHAR(500) =
        'dc_global demasiado grande. Con dc_global=' + CAST(@dc_global AS VARCHAR(20)) +
        ', Dcurvas=' + CAST(@Dcurvas AS VARCHAR(20)) +
        ' km excede la distancia total del circuito (' + CAST(@distancia_total AS VARCHAR(20)) +
        ' km). Usa dc_global <= ' + COALESCE(CAST(@max_dc AS VARCHAR(20)), 'N/A (circuito sin curvas)');
      THROW 50010, @ErrorMsg, 1;
    END

    -- Validar setup completo (5 categorías) en carros finalizados
    DECLARE @carros_incompletos INT;
    SELECT @carros_incompletos = COUNT(*)
    FROM dbo.CARRO c
    WHERE c.estado = 'Finalizado'
      AND (SELECT COUNT(DISTINCT id_categoria) FROM dbo.INSTALA WHERE id_carro = c.id_carro) <> 5;

    IF @carros_incompletos > 0
      THROW 50004, 'Hay carros finalizados sin las 5 categorías instaladas', 1;

    -- Validar que los carros tengan conductor
    IF EXISTS (
      SELECT 1
      FROM dbo.CARRO
      WHERE estado = 'Finalizado' AND id_conductor IS NULL
    )
      THROW 50005, 'Hay carros finalizados sin conductor asignado', 1;

    /* =========================================================
       Crear simulación
       ========================================================= */
    DECLARE @id_simulacion INT;

    INSERT INTO dbo.SIMULACION(id_circuito, fecha_hora, dc_global)
    VALUES (@id_circuito, SYSDATETIME(), @dc_global);

    SET @id_simulacion = SCOPE_IDENTITY();

    /* =========================================================
       Calcular y guardar resultados
       ========================================================= */
    INSERT INTO dbo.RESULTADO(
      id_simulacion, id_carro, id_conductor, posicion,
      p_usado, a_usado, m_usado, h_conductor,
      velocidad_recta, velocidad_curva, penalizacion, tiempo_total
    )
    SELECT
      @id_simulacion,
      resultados.id_carro,
      resultados.id_conductor,
      ROW_NUMBER() OVER (ORDER BY resultados.Tiemposegundos ASC) AS posicion,
      resultados.P,
      resultados.A,
      resultados.M,
      resultados.H,
      resultados.Vrecta,
      resultados.Vcurva,
      resultados.Penalizacion,
      resultados.Tiemposegundos
    FROM (
      SELECT
        c.id_carro,
        c.id_conductor,
        SUM(p.potencia)     AS P,
        SUM(p.aerodinamica) AS A,
        SUM(p.manejo)       AS M,
        co.habilidad_h      AS H,

        -- Distancias (según enunciado)
        @distancia_total    AS D,
        @cantidad_curvas    AS C,
        @Dcurvas            AS Dcurvas,
        @Drectas            AS Drectas,

        -- Velocidades (km/h) (según enunciado)
        (200.0 + 3.0*SUM(p.potencia) + 0.2*co.habilidad_h - 1.0*SUM(p.aerodinamica)) AS Vrecta,
        ( 90.0 + 2.0*SUM(p.aerodinamica) + 2.0*SUM(p.manejo)       + 0.2*co.habilidad_h) AS Vcurva,

        -- Penalización (segundos) (según enunciado)
        (@cantidad_curvas * 40.0) / (1.0 + (co.habilidad_h/100.0)) AS Penalizacion,

        -- Tiempo total (segundos)
        (
          (@Drectas / NULLIF((200.0 + 3.0*SUM(p.potencia) + 0.2*co.habilidad_h - 1.0*SUM(p.aerodinamica)), 0))
          +
          (@Dcurvas / NULLIF(( 90.0 + 2.0*SUM(p.aerodinamica) + 2.0*SUM(p.manejo) + 0.2*co.habilidad_h), 0))
        ) * 3600.0
        +
        ((@cantidad_curvas * 40.0) / (1.0 + (co.habilidad_h/100.0)))
        AS Tiemposegundos

      FROM dbo.CARRO c
      INNER JOIN dbo.CONDUCTOR co ON co.id_usuario = c.id_conductor
      INNER JOIN dbo.INSTALA i    ON i.id_carro = c.id_carro
      INNER JOIN dbo.PARTE p      ON p.id_parte = i.id_parte
      WHERE c.estado = 'Finalizado'
      GROUP BY c.id_carro, c.id_conductor, co.habilidad_h
    ) AS resultados;

    DECLARE @insertados_resultados INT = @@ROWCOUNT;

    IF @insertados_resultados = 0
    BEGIN
      ROLLBACK;
      THROW 50006, 'No se pudieron calcular resultados', 1;
    END

    /* =========================================================
       Guardar setup snapshot (solo carros que participaron)
       ========================================================= */
    INSERT INTO dbo.SIMULACION_SETUP(
      id_simulacion, id_carro, id_categoria, id_parte,
      potencia, aerodinamica, manejo
    )
    SELECT
      @id_simulacion,
      i.id_carro,
      i.id_categoria,
      i.id_parte,
      p.potencia,
      p.aerodinamica,
      p.manejo
    FROM dbo.INSTALA i
    INNER JOIN dbo.PARTE p ON p.id_parte = i.id_parte
    WHERE EXISTS (
      SELECT 1
      FROM dbo.RESULTADO r
      WHERE r.id_simulacion = @id_simulacion
        AND r.id_carro = i.id_carro
    );

    COMMIT;

    /* =========================================================
       Retornar resultados
       ========================================================= */
    SELECT
      r.id_simulacion,
      r.id_carro,
      r.id_conductor,
      r.posicion,
      r.p_usado,
      r.a_usado,
      r.m_usado,
      r.h_conductor,
      r.velocidad_recta,
      r.velocidad_curva,
      r.penalizacion,
      r.tiempo_total,
      u.nombre_completo AS nombre_conductor
    FROM dbo.RESULTADO r
    INNER JOIN dbo.USUARIO u ON u.id_usuario = r.id_conductor
    WHERE r.id_simulacion = @id_simulacion
    ORDER BY r.posicion;

  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK;

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
  END CATCH
END;
GO

PRINT 'SP de simulación completo';
GO

USE F1GarageManager;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SimularCarrera
  @id_circuito INT,
  @dc_global  DECIMAL(10,2),
  @carros_csv NVARCHAR(MAX) = NULL 
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @dc_global <= 0
    THROW 50001, 'dc_global debe ser mayor a 0', 1;

  BEGIN TRAN;
  BEGIN TRY

    /* =======================
       Validaciones base
       ======================= */
    IF NOT EXISTS (SELECT 1 FROM dbo.CIRCUITO WHERE id_circuito = @id_circuito)
      THROW 50002, 'El circuito no existe', 1;

    DECLARE @distancia_total DECIMAL(10,2);
    DECLARE @cantidad_curvas INT;

    SELECT
      @distancia_total = distancia_total,
      @cantidad_curvas = cantidad_curvas
    FROM dbo.CIRCUITO
    WHERE id_circuito = @id_circuito;

    DECLARE @Dcurvas  DECIMAL(10,2) = @cantidad_curvas * @dc_global;
    DECLARE @Drectas  DECIMAL(10,2) = @distancia_total - @Dcurvas;

    IF @cantidad_curvas > 0 AND @Drectas < 0
    BEGIN
      DECLARE @maxdc DECIMAL(10,2) = @distancia_total / NULLIF(@cantidad_curvas,0);

      DECLARE @ErrorMsg NVARCHAR(500) =
        'dc_global demasiado grande. Con dc_global=' + CAST(@dc_global AS VARCHAR(20)) +
        ', Dcurvas=' + CAST(@Dcurvas AS VARCHAR(20)) +
        ' km excede la distancia total (' + CAST(@distancia_total AS VARCHAR(20)) +
        ' km). Usa dc_global <= ' + CAST(@maxdc AS VARCHAR(20));

      THROW 50010, @ErrorMsg, 1;
    END

    /* =======================
       Selección de carros
       ======================= */
    DECLARE @Seleccion TABLE (id_carro INT PRIMARY KEY);

    IF @carros_csv IS NULL OR LTRIM(RTRIM(@carros_csv)) = ''
    BEGIN
      INSERT INTO @Seleccion(id_carro)
      SELECT id_carro
      FROM dbo.CARRO
      WHERE estado = 'Finalizado';
    END
    ELSE
    BEGIN
      INSERT INTO @Seleccion(id_carro)
      SELECT DISTINCT TRY_CAST(value AS INT)
      FROM STRING_SPLIT(@carros_csv, ',')
      WHERE TRY_CAST(value AS INT) IS NOT NULL;
    END

    IF NOT EXISTS (SELECT 1 FROM @Seleccion)
      THROW 50011, 'Debe seleccionar al menos 1 carro para simular', 1;

    -- Todos deben existir y estar Finalizado
    IF EXISTS (
      SELECT 1
      FROM @Seleccion s
      LEFT JOIN dbo.CARRO c ON c.id_carro = s.id_carro
      WHERE c.id_carro IS NULL OR c.estado <> 'Finalizado'
    )
      THROW 50012, 'Hay carros inválidos o que no están en estado Finalizado', 1;

    -- Validar setup completo solo de los seleccionados
    IF EXISTS (
      SELECT 1
      FROM @Seleccion s
      JOIN dbo.CARRO c ON c.id_carro = s.id_carro
      WHERE (SELECT COUNT(DISTINCT id_categoria) FROM dbo.INSTALA WHERE id_carro = c.id_carro) <> 5
    )
      THROW 50004, 'Hay carros seleccionados sin las 5 categorías instaladas', 1;

    -- Validar conductor en los seleccionados
    IF EXISTS (
      SELECT 1
      FROM @Seleccion s
      JOIN dbo.CARRO c ON c.id_carro = s.id_carro
      WHERE c.id_conductor IS NULL
    )
      THROW 50005, 'Hay carros seleccionados sin conductor asignado', 1;

    /* =======================
       Crear simulación
       ======================= */
    DECLARE @id_simulacion INT;

    INSERT INTO dbo.SIMULACION(id_circuito, fecha_hora, dc_global)
    VALUES (@id_circuito, SYSDATETIME(), @dc_global);

    SET @id_simulacion = SCOPE_IDENTITY();

    /* =======================
       Calcular + guardar resultados
       ======================= */
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
        SUM(p.potencia) AS P,
        SUM(p.aerodinamica) AS A,
        SUM(p.manejo) AS M,
        co.habilidad_h AS H,

        (200.0 + 3.0*SUM(p.potencia) + 0.2*co.habilidad_h - 1.0*SUM(p.aerodinamica)) AS Vrecta,
        ( 90.0 + 2.0*SUM(p.aerodinamica) + 2.0*SUM(p.manejo) + 0.2*co.habilidad_h) AS Vcurva,

        (@cantidad_curvas * 40.0) / (1.0 + (co.habilidad_h/100.0)) AS Penalizacion,

        (
          (@Drectas / NULLIF((200.0 + 3.0*SUM(p.potencia) + 0.2*co.habilidad_h - 1.0*SUM(p.aerodinamica)), 0))
          +
          (@Dcurvas / NULLIF(( 90.0 + 2.0*SUM(p.aerodinamica) + 2.0*SUM(p.manejo) + 0.2*co.habilidad_h), 0))
        ) * 3600.0
        +
        ((@cantidad_curvas * 40.0) / (1.0 + (co.habilidad_h/100.0)))
        AS Tiemposegundos

      FROM dbo.CARRO c
      INNER JOIN @Seleccion s ON s.id_carro = c.id_carro
      INNER JOIN dbo.CONDUCTOR co ON co.id_usuario = c.id_conductor
      INNER JOIN dbo.INSTALA i ON i.id_carro = c.id_carro
      INNER JOIN dbo.PARTE p ON p.id_parte = i.id_parte
      GROUP BY c.id_carro, c.id_conductor, co.habilidad_h
    ) AS resultados;

    IF @@ROWCOUNT = 0
      THROW 50006, 'No se pudieron calcular resultados', 1;

    /* =======================
       Guardar setup snapshot (solo de carros en la simulación)
       ======================= */
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
    INNER JOIN dbo.RESULTADO r
      ON r.id_simulacion = @id_simulacion AND r.id_carro = i.id_carro;

    COMMIT;

    /* =======================
       Retornar resultados
       ======================= */
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
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
  END CATCH
END;
GO

USE F1GarageManager;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SimularCarrera
    @id_circuito INT,
    @dc_global DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Validación de DC
    IF @dc_global <= 0 OR @dc_global > 5
        THROW 50001, 'dc_global fuera de rango, debe estar entre 0 y 5', 1;

    BEGIN TRAN;

    BEGIN TRY
        --------------------------------------------------
        -- 1. Crear simulación
        --------------------------------------------------
        DECLARE @id_simulacion INT;

        INSERT INTO dbo.SIMULACION (id_circuito, fecha_hora, dc_global)
        VALUES (@id_circuito, SYSDATETIME(), @dc_global);

        SET @id_simulacion = SCOPE_IDENTITY();

        --------------------------------------------------
        -- 2. Calcular resultados y ranking en una sola pasada
        --------------------------------------------------
        ;WITH Calculos AS (
            SELECT
                c.id_carro,
                c.id_conductor,
                co.habilidad_h,

                SUM(p.potencia)     AS p_total,
                SUM(p.aerodinamica) AS a_total,
                SUM(p.manejo)       AS m_total,

                ci.distancia_total,
                ci.cantidad_curvas
            FROM dbo.CARRO c
            JOIN dbo.CONDUCTOR co ON co.id_usuario = c.id_conductor
            JOIN dbo.INSTALA i    ON i.id_carro = c.id_carro
            JOIN dbo.PARTE p      ON p.id_parte = i.id_parte
            JOIN dbo.CIRCUITO ci  ON ci.id_circuito = @id_circuito
            WHERE c.estado = 'Finalizado'
            GROUP BY
                c.id_carro,
                c.id_conductor,
                co.habilidad_h,
                ci.distancia_total,
                ci.cantidad_curvas
        ),
        Tiempos AS (
            SELECT
                *,
                -- Velocidades
                (p_total * 2.5 + habilidad_h * 0.3 - @dc_global * 0.8) AS vel_recta,
                (a_total * 2.0 + m_total * 1.8 + habilidad_h * 0.4 - @dc_global * 1.2) AS vel_curva,

                -- Penalización
                CASE
                    WHEN (p_total + a_total + m_total) > 45
                    THEN ((p_total + a_total + m_total) - 45) * 0.2
                    ELSE 0
                END AS penalizacion
            FROM Calculos
        ),
        Final AS (
            SELECT
                *,
                (
                    (distancia_total * 0.6) / NULLIF(vel_recta, 0)
                  + (cantidad_curvas * 0.4) / NULLIF(vel_curva, 0)
                  + (RAND() * 0.05)
                ) AS tiempo_total
            FROM Tiempos
        )
        INSERT INTO dbo.RESULTADO (
            id_simulacion,
            id_carro,
            id_conductor,
            posicion,
            p_usado,
            a_usado,
            m_usado,
            h_conductor,
            velocidad_recta,
            velocidad_curva,
            penalizacion,
            tiempo_total
        )
        SELECT
            @id_simulacion,
            id_carro,
            id_conductor,
            ROW_NUMBER() OVER (ORDER BY tiempo_total ASC) AS posicion,
            p_total,
            a_total,
            m_total,
            habilidad_h,
            vel_recta,
            vel_curva,
            penalizacion,
            tiempo_total
        FROM Final;

        COMMIT;

        --------------------------------------------------
        -- 3. Retornar resultados
        --------------------------------------------------
        SELECT
            r.*,
            u.nombre_completo AS nombre_conductor
        FROM dbo.RESULTADO r
        JOIN dbo.USUARIO u ON u.id_usuario = r.id_conductor
        WHERE r.id_simulacion = @id_simulacion
        ORDER BY r.posicion;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

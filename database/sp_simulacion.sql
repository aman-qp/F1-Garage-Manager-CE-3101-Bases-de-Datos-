USE F1GarageManager;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SimularCarrera
    @id_circuito INT,
    @dc_global DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

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
        -- 2. Calcular resultados por carro FINALIZADO
        --------------------------------------------------
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
            c.id_carro,
            c.id_conductor,
            0, -- se asigna luego

            SUM(p.potencia)     AS p_usado,
            SUM(p.aerodinamica) AS a_usado,
            SUM(p.manejo)       AS m_usado,
            co.habilidad_h,

            -- Velocidad recta
            (SUM(p.potencia) * 2.5 + co.habilidad_h * 0.3 - @dc_global * 0.8),

            -- Velocidad curva
            (SUM(p.aerodinamica) * 2.0
             + SUM(p.manejo) * 1.8
             + co.habilidad_h * 0.4
             - @dc_global * 1.2),

            -- Penalización
            CASE
                WHEN (SUM(p.potencia) + SUM(p.aerodinamica) + SUM(p.manejo)) > 45
                THEN ((SUM(p.potencia) + SUM(p.aerodinamica) + SUM(p.manejo)) - 45) * 0.2
                ELSE 0
            END,

            -- Tiempo total
            (
                (ci.distancia_total * 0.6)
                / NULLIF((SUM(p.potencia) * 2.5 + co.habilidad_h * 0.3 - @dc_global * 0.8), 0)

              + (ci.cantidad_curvas * 0.4)
                / NULLIF((SUM(p.aerodinamica) * 2.0
                          + SUM(p.manejo) * 1.8
                          + co.habilidad_h * 0.4
                          - @dc_global * 1.2), 0)

              + CASE
                    WHEN (SUM(p.potencia) + SUM(p.aerodinamica) + SUM(p.manejo)) > 45
                    THEN ((SUM(p.potencia) + SUM(p.aerodinamica) + SUM(p.manejo)) - 45) * 0.2
                    ELSE 0
                END

              + (RAND() * 0.05)
            )
        FROM dbo.CARRO c
        JOIN dbo.CONDUCTOR co ON co.id_usuario = c.id_conductor
        JOIN dbo.INSTALA i ON i.id_carro = c.id_carro
        JOIN dbo.PARTE p ON p.id_parte = i.id_parte
        JOIN dbo.CIRCUITO ci ON ci.id_circuito = @id_circuito
        WHERE c.estado = 'Finalizado'
        GROUP BY c.id_carro, c.id_conductor, co.habilidad_h,
                 ci.distancia_total, ci.cantidad_curvas;

        --------------------------------------------------
        -- 3. Calcular posiciones (ranking)
        --------------------------------------------------
        ;WITH Ranking AS (
            SELECT
                id_simulacion,
                id_carro,
                ROW_NUMBER() OVER (ORDER BY tiempo_total ASC) AS posicion
            FROM dbo.RESULTADO
            WHERE id_simulacion = @id_simulacion
        )
        UPDATE r
        SET r.posicion = rk.posicion
        FROM dbo.RESULTADO r
        JOIN Ranking rk
            ON r.id_simulacion = rk.id_simulacion
           AND r.id_carro = rk.id_carro;

        COMMIT;

        --------------------------------------------------
        -- 4. Retornar resultados ordenados
        --------------------------------------------------
        SELECT *
        FROM dbo.RESULTADO
        WHERE id_simulacion = @id_simulacion
        ORDER BY posicion;

    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO


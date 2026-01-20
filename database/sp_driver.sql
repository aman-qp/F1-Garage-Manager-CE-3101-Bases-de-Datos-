USE F1GarageManager;
GO

-- =============================================
-- SP: Obtener perfil completo del Driver 
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerPerfilDriver
    @id_usuario INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Información del usuario Driver (con o sin ser conductor)
    SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.nombre_completo,
        c.id_equipo,
        e.nombre as nombre_equipo,
        c.habilidad_h,
        ca.id_carro,
        ca.estado as estado_carro,
        CASE WHEN c.id_usuario IS NOT NULL THEN 1 ELSE 0 END as es_conductor
    FROM dbo.USUARIO u
    LEFT JOIN dbo.CONDUCTOR c ON c.id_usuario = u.id_usuario
    LEFT JOIN dbo.EQUIPO e ON c.id_equipo = e.id_equipo
    LEFT JOIN dbo.CARRO ca ON ca.id_conductor = c.id_usuario
    WHERE u.id_usuario = @id_usuario;

    -- Resultados históricos (solo si es conductor)
    SELECT 
        r.id_simulacion,
        s.fecha_hora,
        cir.nombre as nombre_circuito,
        e.nombre as nombre_equipo,
        r.posicion,
        r.tiempo_total,
        r.p_usado,
        r.a_usado,
        r.m_usado,
        r.h_conductor,
        r.velocidad_recta,
        r.velocidad_curva,
        r.penalizacion
    FROM dbo.RESULTADO r
    JOIN dbo.SIMULACION s ON r.id_simulacion = s.id_simulacion
    JOIN dbo.CIRCUITO cir ON s.id_circuito = cir.id_circuito
    JOIN dbo.CARRO ca ON r.id_carro = ca.id_carro
    JOIN dbo.EQUIPO e ON ca.id_equipo = e.id_equipo
    WHERE r.id_conductor = @id_usuario
    ORDER BY s.fecha_hora DESC;

    -- Estadísticas generales (solo si es conductor)
    SELECT 
        COUNT(*) as total_carreras,
        AVG(CAST(r.posicion AS DECIMAL(5,2))) as posicion_promedio,
        MIN(r.posicion) as mejor_posicion,
        SUM(CASE WHEN r.posicion = 1 THEN 1 ELSE 0 END) as victorias,
        SUM(CASE WHEN r.posicion <= 3 THEN 1 ELSE 0 END) as podios
    FROM dbo.RESULTADO r
    WHERE r.id_conductor = @id_usuario;
END;
GO

PRINT 'SP para perfil de Driver actualizado exitosamente';
GO
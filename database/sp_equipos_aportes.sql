-- Stored Procedures para equipos, patrocinadores y aportes
USE F1GarageManager;
GO

-- =============================================
-- EQUIPOS
-- =============================================

-- SP 1: Listar equipos con estadísticas
CREATE OR ALTER PROCEDURE dbo.sp_ListarEquipos
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.id_equipo,
        e.nombre,
        COUNT(DISTINCT c.id_carro) as total_carros,
        COUNT(DISTINCT u.id_usuario) as total_ingenieros,
        COUNT(DISTINCT co.id_usuario) as total_conductores
    FROM dbo.EQUIPO e
    LEFT JOIN dbo.CARRO c ON c.id_equipo = e.id_equipo
    LEFT JOIN dbo.USUARIO u ON u.id_equipo = e.id_equipo AND u.rol = 'Engineer'
    LEFT JOIN dbo.CONDUCTOR co ON co.id_equipo = e.id_equipo
    GROUP BY e.id_equipo, e.nombre
    ORDER BY e.nombre;
END;
GO

-- SP 2: Crear equipo
CREATE OR ALTER PROCEDURE dbo.sp_CrearEquipo
    @nombre VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que no exista
    IF EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE nombre = @nombre)
    BEGIN
        RAISERROR('Ya existe un equipo con ese nombre', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.EQUIPO (nombre)
    VALUES (@nombre);

    SELECT SCOPE_IDENTITY() as id_equipo;
END;
GO

-- =============================================
-- SP: Actualizar equipo
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ActualizarEquipo
    @id_equipo INT,
    @nombre VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.EQUIPO
        WHERE nombre = @nombre
          AND id_equipo <> @id_equipo
    )
    BEGIN
        RAISERROR('Ya existe un equipo con ese nombre', 16, 1);
        RETURN;
    END

    UPDATE dbo.EQUIPO
    SET nombre = @nombre
    WHERE id_equipo = @id_equipo;
END;
GO

-- =============================================
-- SP: Eliminar equipo (solo si no tiene dependencias)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_EliminarEquipo
    @id_equipo INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    -- Si tiene cosas relacionadas, no se deja borrar (evita desastre)
    IF EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_equipo = @id_equipo)
       OR EXISTS (SELECT 1 FROM dbo.USUARIO WHERE id_equipo = @id_equipo)
       OR EXISTS (SELECT 1 FROM dbo.CONDUCTOR WHERE id_equipo = @id_equipo)
       OR EXISTS (SELECT 1 FROM dbo.PATROCINADOR WHERE id_equipo = @id_equipo)
       OR EXISTS (SELECT 1 FROM dbo.APORTA WHERE id_equipo = @id_equipo)
       OR EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_equipo = @id_equipo)
       OR EXISTS (SELECT 1 FROM dbo.TIENE WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('No se puede eliminar: el equipo está en uso (tiene carros/usuarios/conductores/patrocinadores/aportes/compras/inventario).', 16, 1);
        RETURN;
    END

    DELETE FROM dbo.EQUIPO
    WHERE id_equipo = @id_equipo;
END;
GO

-- SP 3: Obtener presupuesto de un equipo
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerPresupuesto
    @id_equipo INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el equipo exista
    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    DECLARE @aportes DECIMAL(12,2);
    DECLARE @gastado DECIMAL(12,2);

    -- Sumar todos los aportes del equipo
    SELECT @aportes = COALESCE(SUM(monto), 0)
    FROM dbo.APORTA
    WHERE id_equipo = @id_equipo;

    -- Sumar solo compras confirmadas (precio_total > 0)
    SELECT @gastado = COALESCE(SUM(precio_total), 0)
    FROM dbo.COMPRA
    WHERE id_equipo = @id_equipo
      AND precio_total > 0;

    SELECT 
        @id_equipo as id_equipo,
        @aportes as total_aportes,
        @gastado as total_gastado,
        (@aportes - @gastado) as presupuesto_disponible;
END;
GO

-- =============================================
-- PATROCINADORES
-- =============================================

-- SP 4: Crear patrocinador
CREATE OR ALTER PROCEDURE dbo.sp_CrearPatrocinador
    @id_equipo INT,
    @nombre VARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el equipo exista
    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    -- Validar que no exista el patrocinador
    IF EXISTS (SELECT 1 FROM dbo.PATROCINADOR WHERE nombre = @nombre)
    BEGIN
        RAISERROR('Ya existe un patrocinador con ese nombre', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.PATROCINADOR (id_equipo, nombre)
    VALUES (@id_equipo, @nombre);

    SELECT SCOPE_IDENTITY() as id_patrocinador;
END;
GO

-- SP 5: Listar patrocinadores de un equipo
CREATE OR ALTER PROCEDURE dbo.sp_ListarPatrocinadores
    @id_equipo INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @id_equipo IS NULL
    BEGIN
        -- Listar todos
        SELECT 
            p.id_patrocinador,
            p.id_equipo,
            e.nombre as nombre_equipo,
            p.nombre as nombre_patrocinador
        FROM dbo.PATROCINADOR p
        JOIN dbo.EQUIPO e ON p.id_equipo = e.id_equipo
        ORDER BY e.nombre, p.nombre;
    END
    ELSE
    BEGIN
        -- Listar de un equipo específico
        SELECT 
            p.id_patrocinador,
            p.id_equipo,
            e.nombre as nombre_equipo,
            p.nombre as nombre_patrocinador
        FROM dbo.PATROCINADOR p
        JOIN dbo.EQUIPO e ON p.id_equipo = e.id_equipo
        WHERE p.id_equipo = @id_equipo
        ORDER BY p.nombre;
    END
END;
GO

-- =============================================
-- APORTES
-- =============================================

-- SP 6: Registrar aporte
CREATE OR ALTER PROCEDURE dbo.sp_RegistrarAporte
    @id_equipo INT,
    @id_patrocinador INT,
    @monto DECIMAL(12,2),
    @descripcion VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validaciones
    IF @monto <= 0
    BEGIN
        RAISERROR('El monto debe ser mayor a 0', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.PATROCINADOR WHERE id_patrocinador = @id_patrocinador)
    BEGIN
        RAISERROR('El patrocinador no existe', 16, 1);
        RETURN;
    END

    -- Validar que el patrocinador pertenezca al equipo
    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.PATROCINADOR 
        WHERE id_patrocinador = @id_patrocinador 
          AND id_equipo = @id_equipo
    )
    BEGIN
        RAISERROR('El patrocinador no pertenece a este equipo', 16, 1);
        RETURN;
    END

    -- Insertar aporte
    INSERT INTO dbo.APORTA (id_equipo, id_patrocinador, fecha, monto, descripcion)
    VALUES (@id_equipo, @id_patrocinador, CAST(GETDATE() AS DATE), @monto, @descripcion);

    SELECT SCOPE_IDENTITY() as id_aporte;
END;
GO

-- SP 7: Listar aportes de un equipo
CREATE OR ALTER PROCEDURE dbo.sp_ListarAportes
    @id_equipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        a.id_aporte,
        a.id_equipo,
        e.nombre as nombre_equipo,
        a.id_patrocinador,
        p.nombre as nombre_patrocinador,
        a.fecha,
        a.monto,
        a.descripcion
    FROM dbo.APORTA a
    JOIN dbo.EQUIPO e ON a.id_equipo = e.id_equipo
    JOIN dbo.PATROCINADOR p ON a.id_patrocinador = p.id_patrocinador
    WHERE a.id_equipo = @id_equipo
    ORDER BY a.fecha DESC, a.id_aporte DESC;
END;
GO

PRINT ' Stored Procedures de equipos, patrocinadores y aportes creados exitosamente';
GO
-- Stored Procedures para Gestión de Conductores
USE F1GarageManager;
GO

-- =============================================
-- SP 1: Listar todos los conductores
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ListarConductores
    @id_equipo INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.id_usuario       AS id_conductor,
        c.id_equipo,
        e.nombre           AS nombre_equipo,
        u.nombre_usuario,
        u.nombre_completo,
        c.habilidad_h,
        CASE
            WHEN ca.id_carro IS NULL THEN 1
            ELSE 0
        END AS disponible
    FROM dbo.CONDUCTOR c
    JOIN dbo.USUARIO u ON u.id_usuario = c.id_usuario
    JOIN dbo.EQUIPO  e ON e.id_equipo  = c.id_equipo
    LEFT JOIN dbo.CARRO ca ON ca.id_conductor = c.id_usuario
    WHERE (@id_equipo IS NULL OR c.id_equipo = @id_equipo)
    ORDER BY e.nombre, u.nombre_completo;
END;
GO

-- =============================================
-- SP 2: Crear conductor (asignar usuario Driver a equipo con habilidad)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_CrearConductor
    @id_usuario INT,
    @id_equipo INT,
    @habilidad_h INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el usuario existe y es Driver
    IF NOT EXISTS (
        SELECT 1 FROM dbo.USUARIO 
        WHERE id_usuario = @id_usuario 
          AND rol = 'Driver'
    )
    BEGIN
        RAISERROR('El usuario no existe o no es Driver', 16, 1);
        RETURN;
    END

    -- Validar que el usuario no sea ya conductor
    IF EXISTS (SELECT 1 FROM dbo.CONDUCTOR WHERE id_usuario = @id_usuario)
    BEGIN
        RAISERROR('Este usuario ya está registrado como conductor', 16, 1);
        RETURN;
    END

    -- Validar que el equipo existe
    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    -- Validar rango de habilidad
    IF @habilidad_h < 0 OR @habilidad_h > 100
    BEGIN
        RAISERROR('La habilidad debe estar entre 0 y 100', 16, 1);
        RETURN;
    END

    -- Crear conductor
    INSERT INTO dbo.CONDUCTOR (id_usuario, id_equipo, habilidad_h)
    VALUES (@id_usuario, @id_equipo, @habilidad_h);

    SELECT 'Conductor creado exitosamente' as mensaje;
END;
GO

-- =============================================
-- SP 3: Actualizar conductor (cambiar equipo o habilidad)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ActualizarConductor
    @id_conductor INT,
    @id_equipo INT,
    @habilidad_h INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el conductor existe
    IF NOT EXISTS (SELECT 1 FROM dbo.CONDUCTOR WHERE id_usuario = @id_conductor)
    BEGIN
        RAISERROR('El conductor no existe', 16, 1);
        RETURN;
    END

    -- Validar que el equipo existe
    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    -- Validar rango de habilidad
    IF @habilidad_h < 0 OR @habilidad_h > 100
    BEGIN
        RAISERROR('La habilidad debe estar entre 0 y 100', 16, 1);
        RETURN;
    END

    -- Validar si está asignado a un carro
    IF EXISTS (
        SELECT 1 FROM dbo.CARRO 
        WHERE id_conductor = @id_conductor
    )
    BEGIN
        -- Si está asignado, verificar que el carro sea del nuevo equipo
        DECLARE @equipo_carro INT;
        SELECT @equipo_carro = id_equipo 
        FROM dbo.CARRO 
        WHERE id_conductor = @id_conductor;

        IF @equipo_carro <> @id_equipo
        BEGIN
            RAISERROR('No se puede cambiar de equipo: el conductor está asignado a un carro', 16, 1);
            RETURN;
        END
    END

    -- Actualizar conductor
    UPDATE dbo.CONDUCTOR
    SET id_equipo = @id_equipo,
        habilidad_h = @habilidad_h
    WHERE id_usuario = @id_conductor;

    SELECT 'Conductor actualizado exitosamente' as mensaje;
END;
GO

-- =============================================
-- SP 4: Eliminar conductor
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_EliminarConductor
    @id_conductor INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el conductor existe
    IF NOT EXISTS (SELECT 1 FROM dbo.CONDUCTOR WHERE id_usuario = @id_conductor)
    BEGIN
        RAISERROR('El conductor no existe', 16, 1);
        RETURN;
    END

    -- Validar que no esté asignado a un carro
    IF EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_conductor = @id_conductor)
    BEGIN
        RAISERROR('No se puede eliminar: el conductor está asignado a un carro', 16, 1);
        RETURN;
    END

    -- Eliminar conductor
    DELETE FROM dbo.CONDUCTOR
    WHERE id_usuario = @id_conductor;

    SELECT 'Conductor eliminado exitosamente' as mensaje;
END;
GO

-- =============================================
-- SP 5: Listar usuarios Driver disponibles (sin ser conductores aún)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ListarDriversDisponibles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.nombre_completo
    FROM dbo.USUARIO u
    WHERE u.rol = 'Driver'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.CONDUCTOR c 
          WHERE c.id_usuario = u.id_usuario
      )
    ORDER BY u.nombre_completo;
END;
GO

PRINT 'Stored Procedures de Conductores creados exitosamente';
GO
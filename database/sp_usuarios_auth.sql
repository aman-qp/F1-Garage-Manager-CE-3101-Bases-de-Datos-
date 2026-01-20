-- Stored Procedures para autenticación y usuarios
USE F1GarageManager;
GO

-- =============================================
-- SP 1: Login - Obtener usuario para autenticación
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Login
    @nombre_usuario VARCHAR(80)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        id_usuario,
        id_equipo,
        nombre_usuario,
        nombre_completo,
        rol,
        contrasena_hash
    FROM dbo.USUARIO
    WHERE nombre_usuario = @nombre_usuario;
END;
GO

-- =============================================
-- SP 2: Crear usuario con validaciones
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_CrearUsuario
    @id_equipo INT = NULL,
    @nombre_usuario VARCHAR(80),
    @nombre_completo VARCHAR(100),
    @rol VARCHAR(20),
    @contrasena_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que no exista el usuario
    IF EXISTS (SELECT 1 FROM dbo.USUARIO WHERE nombre_usuario = @nombre_usuario)
    BEGIN
        RAISERROR('El nombre de usuario ya existe', 16, 1);
        RETURN;
    END

    -- Validar rol válido
    IF @rol NOT IN ('Admin', 'Engineer', 'Driver')
    BEGIN
        RAISERROR('Rol inválido. Debe ser Admin, Engineer o Driver', 16, 1);
        RETURN;
    END

    -- Validar que Engineer tenga equipo
    IF @rol = 'Engineer' AND @id_equipo IS NULL
    BEGIN
        RAISERROR('Un Engineer debe tener asignado un id_equipo', 16, 1);
        RETURN;
    END

    -- Validar que Admin y Driver NO tengan equipo
    IF @rol IN ('Admin', 'Driver') AND @id_equipo IS NOT NULL
    BEGIN
        RAISERROR('Admin y Driver no deben tener id_equipo asignado', 16, 1);
        RETURN;
    END

    -- Si es Engineer, validar que el equipo exista
    IF @rol = 'Engineer' AND NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo especificado no existe', 16, 1);
        RETURN;
    END

    -- Insertar usuario
    INSERT INTO dbo.USUARIO (id_equipo, nombre_usuario, nombre_completo, rol, contrasena_hash)
    VALUES (@id_equipo, @nombre_usuario, @nombre_completo, @rol, @contrasena_hash);

    -- Retornar ID del nuevo usuario
    SELECT SCOPE_IDENTITY() as id;
END;
GO

-- =============================================
-- SP 3: Listar todos los usuarios (Admin)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ListarUsuarios
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.id_usuario,
        u.id_equipo,
        e.nombre as nombre_equipo,
        u.nombre_usuario,
        u.nombre_completo,
        u.rol
    FROM dbo.USUARIO u
    LEFT JOIN dbo.EQUIPO e ON u.id_equipo = e.id_equipo
    ORDER BY u.rol, u.nombre_usuario;
END;
GO

-- =============================================
-- SP 4: Obtener usuario por ID
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerUsuario
    @id_usuario INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.id_usuario,
        u.id_equipo,
        e.nombre as nombre_equipo,
        u.nombre_usuario,
        u.nombre_completo,
        u.rol
    FROM dbo.USUARIO u
    LEFT JOIN dbo.EQUIPO e ON u.id_equipo = e.id_equipo
    WHERE u.id_usuario = @id_usuario;
END;
GO

-- =============================================
-- SP 5: Actualizar Usuario
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ActualizarUsuario
  @id_usuario INT,
  @id_equipo INT = NULL,
  @nombre_usuario VARCHAR(80),
  @nombre_completo VARCHAR(100),
  @rol VARCHAR(20),
  @contrasena_hash VARCHAR(255) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE id_usuario = @id_usuario)
  BEGIN
    RAISERROR('El usuario no existe', 16, 1);
    RETURN;
  END

  -- Evitar duplicado de username con otro usuario
  IF EXISTS (
    SELECT 1 FROM dbo.USUARIO
    WHERE nombre_usuario = @nombre_usuario
      AND id_usuario <> @id_usuario
  )
  BEGIN
    RAISERROR('El nombre de usuario ya existe', 16, 1);
    RETURN;
  END

  IF @rol NOT IN ('Admin', 'Engineer', 'Driver')
  BEGIN
    RAISERROR('Rol inválido. Debe ser Admin, Engineer o Driver', 16, 1);
    RETURN;
  END

  IF @rol = 'Engineer' AND @id_equipo IS NULL
  BEGIN
    RAISERROR('Un Engineer debe tener asignado un id_equipo', 16, 1);
    RETURN;
  END

  IF @rol IN ('Admin', 'Driver') AND @id_equipo IS NOT NULL
  BEGIN
    RAISERROR('Admin y Driver no deben tener id_equipo asignado', 16, 1);
    RETURN;
  END

  IF @rol = 'Engineer' AND NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
  BEGIN
    RAISERROR('El equipo especificado no existe', 16, 1);
    RETURN;
  END

  -- Actualizar (si contrasena_hash viene NULL, no se toca)
  UPDATE dbo.USUARIO
  SET
    id_equipo = @id_equipo,
    nombre_usuario = @nombre_usuario,
    nombre_completo = @nombre_completo,
    rol = @rol,
    contrasena_hash = CASE WHEN @contrasena_hash IS NULL THEN contrasena_hash ELSE @contrasena_hash END
  WHERE id_usuario = @id_usuario;
END;
GO

-- =============================================
-- SP 6: Eliminar Usuario
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_EliminarUsuario
  @id_usuario INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  BEGIN TRAN;

  -- Validar que existe
  IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE id_usuario = @id_usuario)
  BEGIN
    ROLLBACK;
    RAISERROR('El usuario no existe', 16, 1);
    RETURN;
  END

  -- No permitir borrar si está asignado a un carro
  IF EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_conductor = @id_usuario)
  BEGIN
    ROLLBACK;
    RAISERROR('No se puede eliminar: el conductor está asignado a un carro', 16, 1);
    RETURN;
  END

  -- Si es conductor, borrar primero el registro de CONDUCTOR
  DELETE FROM dbo.CONDUCTOR
  WHERE id_usuario = @id_usuario;

  -- Borrar usuario
  DELETE FROM dbo.USUARIO
  WHERE id_usuario = @id_usuario;

  COMMIT;

  SELECT 'Usuario eliminado exitosamente' AS mensaje;
END;
GO

PRINT 'Stored Procedures de autenticación creados exitosamente';
GO
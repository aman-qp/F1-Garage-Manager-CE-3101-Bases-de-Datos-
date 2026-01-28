-- Stored Procedures para Armado de Carros
USE F1GarageManager;
GO

-- =============================================
-- SP 1: Crear un carro nuevo (vacío)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_CrearCarro
    @id_equipo INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el equipo existe
    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe', 16, 1);
        RETURN;
    END

    -- Validar que el equipo no tenga más de 2 carros
    DECLARE @carros_actuales INT;
    SELECT @carros_actuales = COUNT(*) 
    FROM dbo.CARRO 
    WHERE id_equipo = @id_equipo;

    IF @carros_actuales >= 2
    BEGIN
        RAISERROR('El equipo ya tiene el máximo de 2 carros', 16, 1);
        RETURN;
    END

    -- Crear carro en estado "Armando"
    INSERT INTO dbo.CARRO (id_equipo, id_conductor, estado)
    VALUES (@id_equipo, NULL, 'Armando');

    SELECT SCOPE_IDENTITY() as id_carro;
END;
GO

-- =============================================
-- SP 2: Listar carros de un equipo
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ListarCarros
    @id_equipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id_carro,
        c.id_equipo,
        c.id_conductor,
        co.habilidad_h,
        u.nombre_completo as nombre_conductor,
        c.estado,
        COUNT(i.id_categoria) as categorias_instaladas
    FROM dbo.CARRO c
    LEFT JOIN dbo.CONDUCTOR co ON c.id_conductor = co.id_usuario
    LEFT JOIN dbo.USUARIO u ON co.id_usuario = u.id_usuario
    LEFT JOIN dbo.INSTALA i ON c.id_carro = i.id_carro
    WHERE c.id_equipo = @id_equipo
    GROUP BY c.id_carro, c.id_equipo, c.id_conductor, co.habilidad_h, u.nombre_completo, c.estado
    ORDER BY c.id_carro;
END;
GO

-- =============================================
-- SP 3: Obtener setup completo de un carro
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerSetupCarro
    @id_carro INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Información del carro
    SELECT 
        c.id_carro,
        c.id_equipo,
        c.id_conductor,
        co.habilidad_h,
        u.nombre_completo as nombre_conductor,
        c.estado
    FROM dbo.CARRO c
    LEFT JOIN dbo.CONDUCTOR co ON c.id_conductor = co.id_usuario
    LEFT JOIN dbo.USUARIO u ON co.id_usuario = u.id_usuario
    WHERE c.id_carro = @id_carro;

    -- Partes instaladas por categoría
    SELECT 
        i.id_categoria,
        cat.tipo_de_parte,
        i.id_parte,
        p.nombre as nombre_parte,
        p.potencia,
        p.aerodinamica,
        p.manejo,
        i.fecha_instalacion
    FROM dbo.INSTALA i
    JOIN dbo.CATEGORIA cat ON i.id_categoria = cat.id_categoria
    JOIN dbo.PARTE p ON i.id_parte = p.id_parte
    WHERE i.id_carro = @id_carro
    ORDER BY i.id_categoria;

    -- Totales del carro
    SELECT 
        COALESCE(SUM(p.potencia), 0) as total_potencia,
        COALESCE(SUM(p.aerodinamica), 0) as total_aerodinamica,
        COALESCE(SUM(p.manejo), 0) as total_manejo
    FROM dbo.INSTALA i
    JOIN dbo.PARTE p ON i.id_parte = p.id_parte
    WHERE i.id_carro = @id_carro;
END;
GO

-- =============================================
-- SP 4: Listar partes disponibles en inventario por categoría
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ListarInventarioPorCategoria
    @id_equipo INT,
    @id_categoria INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        p.id_parte,
        p.nombre,
        p.potencia,
        p.aerodinamica,
        p.manejo,
        t.cantidad
    FROM dbo.TIENE t
    JOIN dbo.PARTE p ON t.id_parte = p.id_parte
    WHERE t.id_equipo = @id_equipo
      AND p.id_categoria = @id_categoria
      AND t.cantidad > 0
    ORDER BY p.nombre;
END;
GO

-- =============================================
-- SP 5: Instalar una parte en un carro
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_InstalarParte
    @id_carro INT,
    @id_categoria INT,
    @id_parte INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    -- Obtener el equipo del carro
    DECLARE @id_equipo INT;
    SELECT @id_equipo = id_equipo 
    FROM dbo.CARRO 
    WHERE id_carro = @id_carro;

    IF @id_equipo IS NULL
    BEGIN
        ROLLBACK;
        RAISERROR('El carro no existe', 16, 1);
        RETURN;
    END

    -- Validar que el carro esté en estado "Armando"
    DECLARE @estado VARCHAR(20);
    SELECT @estado = estado FROM dbo.CARRO WHERE id_carro = @id_carro;

    IF @estado <> 'Armando'
    BEGIN
        ROLLBACK;
        RAISERROR('Solo se pueden modificar carros en estado Armando', 16, 1);
        RETURN;
    END

    -- Validar que la parte sea de la categoría correcta
    DECLARE @categoria_parte INT;
    SELECT @categoria_parte = id_categoria FROM dbo.PARTE WHERE id_parte = @id_parte;

    IF @categoria_parte <> @id_categoria
    BEGIN
        ROLLBACK;
        RAISERROR('La parte no pertenece a la categoría seleccionada', 16, 1);
        RETURN;
    END

    -- Validar que la parte esté en el inventario del equipo
    DECLARE @cantidad_disponible INT;
    SELECT @cantidad_disponible = cantidad 
    FROM dbo.TIENE 
    WHERE id_equipo = @id_equipo AND id_parte = @id_parte;

    IF @cantidad_disponible IS NULL OR @cantidad_disponible <= 0
    BEGIN
        ROLLBACK;
        RAISERROR('La parte no está disponible en el inventario', 16, 1);
        RETURN;
    END

    -- Verificar si ya hay una parte instalada en esa categoría
    DECLARE @parte_actual INT;
    SELECT @parte_actual = id_parte 
    FROM dbo.INSTALA 
    WHERE id_carro = @id_carro AND id_categoria = @id_categoria;

    IF @parte_actual IS NOT NULL
    BEGIN
        -- Ya hay una parte, entonces es un reemplazo
        -- Devolver la parte anterior al inventario
        UPDATE dbo.TIENE
        SET cantidad = cantidad + 1
        WHERE id_equipo = @id_equipo AND id_parte = @parte_actual;

        -- Eliminar la instalación anterior
        DELETE FROM dbo.INSTALA
        WHERE id_carro = @id_carro AND id_categoria = @id_categoria;
    END

    -- Disminuir inventario de la nueva parte
    UPDATE dbo.TIENE
    SET cantidad = cantidad - 1
    WHERE id_equipo = @id_equipo AND id_parte = @id_parte;

    -- Instalar la nueva parte
    INSERT INTO dbo.INSTALA (id_carro, id_categoria, id_parte, id_equipo, fecha_instalacion)
    VALUES (@id_carro, @id_categoria, @id_parte, @id_equipo, CAST(GETDATE() AS DATE));

    COMMIT;

    SELECT 'Parte instalada exitosamente' as mensaje;
END;
GO

-- =============================================
-- SP 6: Asignar conductor al carro
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_AsignarConductor
    @id_carro INT,
    @id_conductor INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el carro existe
    IF NOT EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_carro = @id_carro)
    BEGIN
        RAISERROR('El carro no existe', 16, 1);
        RETURN;
    END

    -- Validar que el conductor existe
    IF NOT EXISTS (SELECT 1 FROM dbo.CONDUCTOR WHERE id_usuario = @id_conductor)
    BEGIN
        RAISERROR('El conductor no existe', 16, 1);
        RETURN;
    END

    -- Validar que el conductor pertenezca al mismo equipo del carro
    DECLARE @equipo_carro INT;
    DECLARE @equipo_conductor INT;

    SELECT @equipo_carro = id_equipo FROM dbo.CARRO WHERE id_carro = @id_carro;
    SELECT @equipo_conductor = id_equipo FROM dbo.CONDUCTOR WHERE id_usuario = @id_conductor;

    IF @equipo_carro <> @equipo_conductor
    BEGIN
        RAISERROR('El conductor no pertenece al equipo del carro', 16, 1);
        RETURN;
    END

    -- Validar que el conductor no esté asignado a otro carro
    IF EXISTS (
        SELECT 1 FROM dbo.CARRO 
        WHERE id_conductor = @id_conductor 
          AND id_carro <> @id_carro
    )
    BEGIN
        RAISERROR('El conductor ya está asignado a otro carro', 16, 1);
        RETURN;
    END

    -- Asignar conductor
    UPDATE dbo.CARRO
    SET id_conductor = @id_conductor
    WHERE id_carro = @id_carro;

    SELECT 'Conductor asignado exitosamente' as mensaje;
END;
GO

-- =============================================
-- SP 7: Finalizar carro (marcar como listo)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_FinalizarCarro
    @id_carro INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el carro existe
    IF NOT EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_carro = @id_carro)
    BEGIN
        RAISERROR('El carro no existe', 16, 1);
        RETURN;
    END

    -- Validar que tenga las 5 categorías instaladas
    DECLARE @categorias_instaladas INT;
    SELECT @categorias_instaladas = COUNT(DISTINCT id_categoria)
    FROM dbo.INSTALA
    WHERE id_carro = @id_carro;

    IF @categorias_instaladas < 5
    BEGIN
        RAISERROR('El carro debe tener las 5 categorías instaladas para finalizarlo', 16, 1);
        RETURN;
    END

    -- Validar que tenga conductor asignado
    DECLARE @tiene_conductor INT;
    SELECT @tiene_conductor = id_conductor FROM dbo.CARRO WHERE id_carro = @id_carro;

    IF @tiene_conductor IS NULL
    BEGIN
        RAISERROR('El carro debe tener un conductor asignado', 16, 1);
        RETURN;
    END

    -- Marcar como finalizado
    UPDATE dbo.CARRO
    SET estado = 'Finalizado'
    WHERE id_carro = @id_carro;

    SELECT 'Carro finalizado exitosamente' as mensaje;
END;
GO

-- =============================================
-- SP 8: Listar conductores disponibles del equipo
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_ListarConductoresDisponibles
    @id_equipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id_usuario as id_conductor,
        u.nombre_completo,
        c.habilidad_h,
        CASE 
            WHEN ca.id_carro IS NULL THEN 1
            ELSE 0
        END as disponible
    FROM dbo.CONDUCTOR c
    JOIN dbo.USUARIO u ON c.id_usuario = u.id_usuario
    LEFT JOIN dbo.CARRO ca ON ca.id_conductor = c.id_usuario
    WHERE c.id_equipo = @id_equipo
    ORDER BY disponible DESC, u.nombre_completo;
END;
GO

-- =============================================
-- SP 9: Eliminar carro
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_EliminarCarro
    @id_carro INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    -- Validar que el carro existe
    IF NOT EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_carro = @id_carro)
    BEGIN
        ROLLBACK;
        RAISERROR('El carro no existe', 16, 1);
        RETURN;
    END

    -- No permitir eliminar si ya participó en simulaciones
    IF EXISTS (SELECT 1 FROM dbo.RESULTADO WHERE id_carro = @id_carro)
    BEGIN
        ROLLBACK;
        RAISERROR('No se puede eliminar: el carro ha participado en simulaciones', 16, 1);
        RETURN;
    END

    -- Devolver partes instaladas al inventario del equipo (por conteo)
    ;WITH Devuelve AS (
        SELECT
            i.id_equipo,
            i.id_parte,
            COUNT(*) AS cant
        FROM dbo.INSTALA i
        WHERE i.id_carro = @id_carro
        GROUP BY i.id_equipo, i.id_parte
    )
    UPDATE t
      SET t.cantidad = t.cantidad + d.cant
    FROM dbo.TIENE t
    JOIN Devuelve d
      ON d.id_equipo = t.id_equipo
     AND d.id_parte  = t.id_parte;

    -- Eliminar instalaciones
    DELETE FROM dbo.INSTALA
    WHERE id_carro = @id_carro;

    -- Eliminar carro (esto libera al conductor automáticamente)
    DELETE FROM dbo.CARRO
    WHERE id_carro = @id_carro;

    COMMIT;

    SELECT 'Carro eliminado exitosamente. Partes devueltas al inventario y conductor liberado.' AS mensaje;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ObtenerInventarioEquipo
  @id_equipo INT
AS
BEGIN
  SET NOCOUNT ON;

  -- Validar que exista el equipo (opcional pero bonito)
  IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
  BEGIN
    RAISERROR('El equipo no existe', 16, 1);
    RETURN;
  END

  SELECT 
    t.id_equipo,
    t.id_parte,
    pa.nombre AS nombre_parte,
    c.tipo_de_parte AS categoria,
    t.cantidad,
    t.fecha_adquirido AS fecha_adquisicion,
    pa.potencia AS p,
    pa.aerodinamica AS a,
    pa.manejo AS m
  FROM dbo.TIENE t
  JOIN dbo.PARTE pa ON pa.id_parte = t.id_parte
  JOIN dbo.CATEGORIA c ON c.id_categoria = pa.id_categoria
  WHERE t.id_equipo = @id_equipo
    AND t.cantidad > 0
  ORDER BY c.tipo_de_parte, pa.nombre;
END;
GO

-- =============================================
-- SP 10: Listar carros finalizados     
-- =============================================

CREATE OR ALTER PROCEDURE dbo.sp_ListarCarrosFinalizados
  @id_equipo INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    c.id_carro,
    c.id_equipo,
    e.nombre AS equipo,
    c.id_conductor,
    u.nombre_completo AS conductor
  FROM dbo.CARRO c
  INNER JOIN dbo.EQUIPO e ON e.id_equipo = c.id_equipo
  LEFT JOIN dbo.USUARIO u ON u.id_usuario = c.id_conductor
  WHERE c.estado = 'Finalizado'
    AND (@id_equipo IS NULL OR c.id_equipo = @id_equipo)
  ORDER BY e.nombre, c.id_carro;
END;
GO

-- =============================================
-- SP 11: Reabrir un carro finalizado   
-- =============================================

CREATE OR ALTER PROCEDURE dbo.sp_ReabrirCarro
  @id_carro INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_carro = @id_carro)
    THROW 51001, 'El carro no existe', 1;

  IF EXISTS (SELECT 1 FROM dbo.CARRO WHERE id_carro = @id_carro AND estado <> 'Finalizado')
    THROW 51002, 'Solo se puede reabrir un carro que esté en estado Finalizado', 1;

  UPDATE dbo.CARRO
  SET estado = 'Armando'
  WHERE id_carro = @id_carro;

  SELECT 'Carro reabierto (Armando). Ya podés cambiar las partes.' AS mensaje;
END;
GO

PRINT 'Stored Procedures de Armado creados exitosamente';
GO
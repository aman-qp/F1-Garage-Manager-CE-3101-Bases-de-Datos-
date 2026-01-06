-- Triggers para la base de datos F1GarageManager

USE F1GarageManager;
GO

PRINT 'Creando triggers...';
GO

-- TRIGGER 1: Solo usuarios Driver pueden ser Conductores

CREATE OR ALTER TRIGGER trg_validar_conductor_driver
ON CONDUCTOR
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN USUARIO u ON u.id_usuario = i.id_usuario
        WHERE u.rol <> 'Driver'
    )
    BEGIN
        RAISERROR('Solo usuarios con rol Driver pueden ser conductores.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

-- TRIGGER 2: Máximo 2 carros por equipo (multi-row safe)

CREATE OR ALTER TRIGGER trg_max_2_carros_equipo
ON CARRO
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM CARRO c
        JOIN (SELECT DISTINCT id_equipo FROM inserted) x
          ON x.id_equipo = c.id_equipo
        GROUP BY c.id_equipo
        HAVING COUNT(*) > 2
    )
    BEGIN
        RAISERROR('Un equipo no puede tener más de 2 carros.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

-- TRIGGER 3: Conductor asignado debe ser del mismo equipo del carro

CREATE OR ALTER TRIGGER trg_validar_conductor_equipo
ON CARRO
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN CONDUCTOR c ON c.id_usuario = i.id_conductor
        WHERE i.id_conductor IS NOT NULL
          AND c.id_equipo <> i.id_equipo
    )
    BEGIN
        RAISERROR('El conductor debe pertenecer al mismo equipo del carro.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

-- TRIGGER 4: Si un carro pasa a Finalizado, debe tener 5 categorías instaladas

CREATE OR ALTER TRIGGER trg_validar_carro_finalizado_5_partes
ON CARRO
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Solo validar carros que cambiaron a Finalizado
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN deleted d ON d.id_carro = i.id_carro
        WHERE i.estado = 'Finalizado'
          AND d.estado <> 'Finalizado'
          AND (
              SELECT COUNT(DISTINCT id_categoria)
              FROM INSTALA
              WHERE id_carro = i.id_carro
          ) <> 5
    )
    BEGIN
        RAISERROR('Para finalizar un carro debe tener 5 partes instaladas (una por categoría).', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

-- TRIGGER 5: Al instalar, debe haber inventario suficiente y se descuenta (multi-row)

CREATE OR ALTER TRIGGER trg_instala_descuenta_inventario
ON INSTALA
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que TIENE.cantidad alcance para todas las filas insertadas
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT id_equipo, id_parte, COUNT(*) AS qty_need
            FROM inserted
            GROUP BY id_equipo, id_parte
        ) r
        JOIN TIENE t ON t.id_equipo = r.id_equipo AND t.id_parte = r.id_parte
        WHERE t.cantidad < r.qty_need
    )
    BEGIN
        RAISERROR('No hay suficiente inventario para instalar una o más partes.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END

    -- Descontar inventario agregando por equipo-parte
    UPDATE t
    SET t.cantidad = t.cantidad - r.qty_need
    FROM TIENE t
    JOIN (
        SELECT id_equipo, id_parte, COUNT(*) AS qty_need
        FROM inserted
        GROUP BY id_equipo, id_parte
    ) r ON r.id_equipo = t.id_equipo AND r.id_parte = t.id_parte;
END;
GO

-- TRIGGER 6: Al desinstalar, la parte regresa al inventario (multi-row)

CREATE OR ALTER TRIGGER trg_instala_devuelve_inventario
ON INSTALA
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Devolver al inventario agregando por equipo-parte
    UPDATE t
    SET t.cantidad = t.cantidad + r.qty_back
    FROM TIENE t
    JOIN (
        SELECT id_equipo, id_parte, COUNT(*) AS qty_back
        FROM deleted
        GROUP BY id_equipo, id_parte
    ) r ON r.id_equipo = t.id_equipo AND r.id_parte = t.id_parte;
END;
GO

PRINT 'Triggers creados exitosamente.';
GO
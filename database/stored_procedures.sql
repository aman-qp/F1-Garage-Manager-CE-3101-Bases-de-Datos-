-- Stored Procedures de la base de datos F1GarageManager

USE F1GarageManager;
GO

--  SP 1: Crear una compra (carrito vacío)

CREATE OR ALTER PROCEDURE dbo.sp_compra_crear
    @id_equipo INT,
    @id_compra INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.COMPRA (id_equipo, fecha_de_compra, precio_total)
    VALUES (@id_equipo, CAST(GETDATE() AS DATE), 0);

    SET @id_compra = SCOPE_IDENTITY();
END;
GO

-- SP 2: Agregar una parte a la compra

CREATE OR ALTER PROCEDURE dbo.sp_compra_agregar_item
    @id_compra INT,
    @id_parte  INT,
    @cantidad  INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @cantidad <= 0
    BEGIN
        RAISERROR('La cantidad debe ser mayor a 0.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra)
    BEGIN
        RAISERROR('La compra no existe.', 16, 1);
        RETURN;
    END

    -- Evitar modificar una compra ya confirmada
    IF EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra AND precio_total > 0)
    BEGIN
        RAISERROR('No se puede modificar una compra ya confirmada.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.PARTE WHERE id_parte = @id_parte)
    BEGIN
        RAISERROR('La parte no existe.', 16, 1);
        RETURN;
    END

    DECLARE @precio_unitario DECIMAL(12,2);

    SELECT @precio_unitario = precio_catalogo
    FROM dbo.PARTE
    WHERE id_parte = @id_parte;

    IF EXISTS (
        SELECT 1
        FROM dbo.COMPRA_DE
        WHERE id_compra = @id_compra AND id_parte = @id_parte
    )
    BEGIN
        UPDATE dbo.COMPRA_DE
        SET cantidad = cantidad + @cantidad
        WHERE id_compra = @id_compra AND id_parte = @id_parte;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.COMPRA_DE (id_compra, id_parte, precio_unitario, cantidad)
        VALUES (@id_compra, @id_parte, @precio_unitario, @cantidad);
    END
END;
GO



-- SP 3: Confirmar compra (transacción)

CREATE OR ALTER PROCEDURE dbo.sp_compra_confirmar
    @id_compra INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra)
    BEGIN
        RAISERROR('La compra no existe.', 16, 1);
        RETURN;
    END

    -- Evitar confirmar 2 veces
    IF EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra AND precio_total > 0)
    BEGIN
        RAISERROR('La compra ya fue confirmada.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA_DE WHERE id_compra = @id_compra)
    BEGIN
        RAISERROR('La compra no tiene items.', 16, 1);
        RETURN;
    END

    DECLARE @id_equipo INT;
    SELECT @id_equipo = id_equipo
    FROM dbo.COMPRA
    WHERE id_compra = @id_compra;

    BEGIN TRAN;

    -- 1) Total de la compra
    DECLARE @total DECIMAL(12,2);

    SELECT @total = COALESCE(SUM(precio_unitario * cantidad), 0)
    FROM dbo.COMPRA_DE
    WHERE id_compra = @id_compra;

    IF @total <= 0
    BEGIN
        ROLLBACK;
        RAISERROR('El total de la compra no es válido.', 16, 1);
        RETURN;
    END

    -- 2) Presupuesto disponible = aportes - compras confirmadas (precio_total > 0)
    DECLARE @aportes DECIMAL(12,2);
    DECLARE @gastado DECIMAL(12,2);
    DECLARE @disponible DECIMAL(12,2);

    SELECT @aportes = COALESCE(SUM(monto), 0)
    FROM dbo.APORTA
    WHERE id_equipo = @id_equipo;

    SELECT @gastado = COALESCE(SUM(precio_total), 0)
    FROM dbo.COMPRA
    WHERE id_equipo = @id_equipo
      AND precio_total > 0;

    SET @disponible = @aportes - @gastado;

    IF @disponible < @total
    BEGIN
        ROLLBACK;
        RAISERROR('Presupuesto insuficiente.', 16, 1);
        RETURN;
    END

    -- 3) Validar stock suficiente (antes de descontar)
    IF EXISTS (
        SELECT 1
        FROM dbo.COMPRA_DE cd
        JOIN dbo.PARTE p ON p.id_parte = cd.id_parte
        WHERE cd.id_compra = @id_compra
          AND p.stock < cd.cantidad
    )
    BEGIN
        ROLLBACK;
        RAISERROR('Stock insuficiente en una o más partes.', 16, 1);
        RETURN;
    END

    -- 4) Descontar stock
    UPDATE p
    SET p.stock = p.stock - cd.cantidad
    FROM dbo.PARTE p
    JOIN dbo.COMPRA_DE cd ON cd.id_parte = p.id_parte
    WHERE cd.id_compra = @id_compra;

    -- 5) Actualizar inventario (TIENE) con MERGE
    MERGE dbo.TIENE AS t
    USING (
        SELECT
            @id_equipo AS id_equipo,
            cd.id_parte,
            SUM(cd.cantidad) AS cantidad_sum
        FROM dbo.COMPRA_DE cd
        WHERE cd.id_compra = @id_compra
        GROUP BY cd.id_parte
    ) AS s
    ON (t.id_equipo = s.id_equipo AND t.id_parte = s.id_parte)
    WHEN MATCHED THEN
        UPDATE SET
            t.cantidad = t.cantidad + s.cantidad_sum
    WHEN NOT MATCHED THEN
        INSERT (id_equipo, id_parte, cantidad, fecha_adquirido)
        VALUES (s.id_equipo, s.id_parte, s.cantidad_sum, CAST(GETDATE() AS DATE));

    -- 6) Marcar compra como confirmada guardando el total
    UPDATE dbo.COMPRA
    SET precio_total = @total
    WHERE id_compra = @id_compra;

    COMMIT;

    SELECT
        @id_compra AS id_compra,
        @id_equipo AS id_equipo,
        @total     AS precio_total;
END;
GO

PRINT 'Stored Procedures creados/actualizados exitosamente.';
GO

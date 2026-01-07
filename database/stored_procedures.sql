-- Stored Procedures para gestión de compras en F1GarageManager

USE F1GarageManager;
GO

-- SP 1: Crear una compra (carrito vacío)

CREATE OR ALTER PROCEDURE dbo.sp_compra_crear
    @id_equipo INT,
    @id_compra INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el equipo existe
    IF NOT EXISTS (SELECT 1 FROM dbo.EQUIPO WHERE id_equipo = @id_equipo)
    BEGIN
        RAISERROR('El equipo no existe.', 16, 1);
        RETURN;
    END

    -- Crear compra con precio_total=0 (no confirmada)
    INSERT INTO dbo.COMPRA (id_equipo, fecha_de_compra, precio_total)
    VALUES (@id_equipo, CAST(GETDATE() AS DATE), 0);

    -- Retornar el ID generado
    SET @id_compra = SCOPE_IDENTITY();
END;
GO

-- SP 2: Agregar una parte al carrito de compra
   
CREATE OR ALTER PROCEDURE dbo.sp_compra_agregar_item
    @id_compra INT,
    @id_parte  INT,
    @cantidad  INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar cantidad positiva
    IF @cantidad <= 0
    BEGIN
        RAISERROR('La cantidad debe ser mayor a 0.', 16, 1);
        RETURN;
    END

    -- Validar que la compra existe
    IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra)
    BEGIN
        RAISERROR('La compra no existe.', 16, 1);
        RETURN;
    END

    -- Evitar modificar una compra ya confirmada (precio_total > 0)
    IF EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra AND precio_total > 0)
    BEGIN
        RAISERROR('No se puede modificar una compra ya confirmada.', 16, 1);
        RETURN;
    END

    -- Validar que la parte existe en el catálogo
    IF NOT EXISTS (SELECT 1 FROM dbo.PARTE WHERE id_parte = @id_parte)
    BEGIN
        RAISERROR('La parte no existe.', 16, 1);
        RETURN;
    END

    -- Capturar precio actual
    DECLARE @precio_unitario DECIMAL(12,2);

    SELECT @precio_unitario = precio_catalogo
    FROM dbo.PARTE
    WHERE id_parte = @id_parte;

    -- Si la parte ya está en el carrito, sumar cantidad
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
        -- Si no existe, insertar nueva línea
        INSERT INTO dbo.COMPRA_DE (id_compra, id_parte, precio_unitario, cantidad)
        VALUES (@id_compra, @id_parte, @precio_unitario, @cantidad);
    END
END;
GO

-- SP 3: Confirmar compra (transacción completa)

CREATE OR ALTER PROCEDURE dbo.sp_compra_confirmar
    @id_compra INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;  -- Rollback automático 

    -- Validar que la compra existe
    IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra)
    BEGIN
        RAISERROR('La compra no existe.', 16, 1);
        RETURN;
    END

    -- Evitar confirmar 2 veces (precio_total > 0 indica ya confirmada)
    IF EXISTS (SELECT 1 FROM dbo.COMPRA WHERE id_compra = @id_compra AND precio_total > 0)
    BEGIN
        RAISERROR('La compra ya fue confirmada.', 16, 1);
        RETURN;
    END

    -- Validar que la compra tiene items
    IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA_DE WHERE id_compra = @id_compra)
    BEGIN
        RAISERROR('La compra no tiene items.', 16, 1);
        RETURN;
    END

    -- Obtener el equipo que realiza la compra
    DECLARE @id_equipo INT;
    SELECT @id_equipo = id_equipo
    FROM dbo.COMPRA
    WHERE id_compra = @id_compra;

    BEGIN TRAN;

    --Calcular total de la compra

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

    --Validar presupuesto disponible

    -- Presupuesto = Aportes - Compras confirmadas
    DECLARE @aportes DECIMAL(12,2);
    DECLARE @gastado DECIMAL(12,2);
    DECLARE @disponible DECIMAL(12,2);

    -- Sumar todos los aportes del equipo
    SELECT @aportes = COALESCE(SUM(monto), 0)
    FROM dbo.APORTA
    WHERE id_equipo = @id_equipo;

    -- Sumar solo compras confirmadas (precio_total > 0)
    SELECT @gastado = COALESCE(SUM(precio_total), 0)
    FROM dbo.COMPRA
    WHERE id_equipo = @id_equipo
      AND precio_total > 0;  -- Solo confirmadas

    SET @disponible = @aportes - @gastado;

    -- Rechazar si no hay presupuesto suficiente
    IF @disponible < @total
    BEGIN
        ROLLBACK;
        RAISERROR('Presupuesto insuficiente.', 16, 1);
        RETURN;
    END

    -- Validar stock suficiente en catálogo

    -- Verificar ANTES de descontar
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

    --Descontar stock del catálogo global

    UPDATE p
    SET p.stock = p.stock - cd.cantidad
    FROM dbo.PARTE p
    JOIN dbo.COMPRA_DE cd ON cd.id_parte = p.id_parte
    WHERE cd.id_compra = @id_compra;

    --Actualizar inventario del equipo (TIENE)
    
    --Incrementar cantidad de partes que YA tiene el equipo
    UPDATE t
    SET t.cantidad = t.cantidad + s.cantidad_sum
    FROM dbo.TIENE t
    JOIN (
        SELECT id_parte, SUM(cantidad) AS cantidad_sum
        FROM dbo.COMPRA_DE
        WHERE id_compra = @id_compra
        GROUP BY id_parte
    ) s ON s.id_parte = t.id_parte
    WHERE t.id_equipo = @id_equipo;

    --Insertar partes que el equipo NO tenía
    INSERT INTO dbo.TIENE (id_equipo, id_parte, cantidad, fecha_adquirido)
    SELECT
        @id_equipo,
        s.id_parte,
        s.cantidad_sum,
        CAST(GETDATE() AS DATE)  -- Fecha de primera adquisición
    FROM (
        SELECT id_parte, SUM(cantidad) AS cantidad_sum
        FROM dbo.COMPRA_DE
        WHERE id_compra = @id_compra
        GROUP BY id_parte
    ) s
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.TIENE t
        WHERE t.id_equipo = @id_equipo
          AND t.id_parte  = s.id_parte
    );

    -- PASO 6: Marcar compra como confirmada

    UPDATE dbo.COMPRA
    SET precio_total = @total
    WHERE id_compra = @id_compra;

    COMMIT;

    -- Retornar resumen de la compra confirmada
    SELECT
        @id_compra AS id_compra,
        @id_equipo AS id_equipo,
        @total     AS precio_total;
END;
GO


PRINT 'Stored Procedures creados exitosamente.';
GO

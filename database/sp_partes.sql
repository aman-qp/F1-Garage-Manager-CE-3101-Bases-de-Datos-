USE F1GarageManager;
GO

---SP Listar Partes 
CREATE PROCEDURE dbo.SP_Partes_Listar
AS
BEGIN
    SELECT 
        p.id_parte,
        p.nombre,
        c.tipo_de_parte AS categoria,
        p.precio_catalogo AS precio,
        p.stock,
        p.potencia AS P,
        p.aerodinamica AS A,
        p.manejo AS M
    FROM dbo.PARTE p
    JOIN dbo.CATEGORIA c ON c.id_categoria = p.id_categoria
    ORDER BY c.tipo_de_parte, p.nombre;
END;
GO

---SP Insertar Parte 
CREATE PROCEDURE dbo.SP_Partes_Insertar
    @nombre VARCHAR(120),
    @id_categoria INT,
    @potencia INT,
    @aerodinamica INT,
    @manejo INT,
    @precio_catalogo DECIMAL(12,2),
    @stock INT
AS
BEGIN
    INSERT INTO dbo.PARTE
    (nombre, id_categoria, potencia, aerodinamica, manejo, precio_catalogo, stock)
    VALUES
    (@nombre, @id_categoria, @potencia, @aerodinamica, @manejo, @precio_catalogo, @stock);

    SELECT SCOPE_IDENTITY() AS id_parte;
END;
GO

--- SP Actualizar Parte 
CREATE PROCEDURE dbo.SP_Partes_Actualizar
    @id_parte INT,
    @nombre VARCHAR(120),
    @id_categoria INT,
    @potencia INT,
    @aerodinamica INT,
    @manejo INT,
    @precio_catalogo DECIMAL(12,2),
    @stock INT
AS
BEGIN
    UPDATE dbo.PARTE
    SET nombre = @nombre,
        id_categoria = @id_categoria,
        potencia = @potencia,
        aerodinamica = @aerodinamica,
        manejo = @manejo,
        precio_catalogo = @precio_catalogo,
        stock = @stock
    WHERE id_parte = @id_parte;
END;
GO

---SP Eliminar Parte 
CREATE PROCEDURE dbo.SP_Partes_Eliminar
    @id_parte INT
AS
BEGIN
    DELETE FROM dbo.PARTE
    WHERE id_parte = @id_parte;
END;
GO

---SP listar Categorías 
CREATE PROCEDURE dbo.SP_Categorias_Listar
AS
BEGIN
    SELECT id_categoria, tipo_de_parte
    FROM dbo.CATEGORIA
    ORDER BY id_categoria;
END;
GO


USE F1GarageManager;
GO
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

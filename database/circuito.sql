USE F1GarageManager;
GO

-- ============================
-- LISTAR
-- ============================
CREATE OR ALTER PROCEDURE dbo.sp_Circuitos_Listar
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    id_circuito,
    nombre,
    distancia_total,
    cantidad_curvas
  FROM dbo.CIRCUITO
  ORDER BY nombre;
END;
GO

-- ============================
-- CREAR
-- ============================
CREATE OR ALTER PROCEDURE dbo.sp_Circuitos_Crear
  @nombre VARCHAR(120),
  @distancia_total DECIMAL(10,3),
  @cantidad_curvas INT
AS
BEGIN
  SET NOCOUNT ON;

  IF @nombre IS NULL OR LTRIM(RTRIM(@nombre)) = ''
    THROW 50001, 'El nombre es requerido', 1;

  IF @distancia_total IS NULL OR @distancia_total <= 0
    THROW 50002, 'La distancia_total debe ser mayor a 0', 1;

  IF @cantidad_curvas IS NULL OR @cantidad_curvas < 0
    THROW 50003, 'La cantidad_curvas debe ser >= 0', 1;

  INSERT INTO dbo.CIRCUITO(nombre, distancia_total, cantidad_curvas)
  VALUES (@nombre, @distancia_total, @cantidad_curvas);

  SELECT SCOPE_IDENTITY() AS id_circuito;
END;
GO

-- ============================
-- ACTUALIZAR
-- ============================
CREATE OR ALTER PROCEDURE dbo.sp_Circuitos_Actualizar
  @id_circuito INT,
  @nombre VARCHAR(120),
  @distancia_total DECIMAL(10,3),
  @cantidad_curvas INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.CIRCUITO WHERE id_circuito = @id_circuito)
    THROW 50010, 'El circuito no existe', 1;

  IF @nombre IS NULL OR LTRIM(RTRIM(@nombre)) = ''
    THROW 50001, 'El nombre es requerido', 1;

  IF @distancia_total IS NULL OR @distancia_total <= 0
    THROW 50002, 'La distancia_total debe ser mayor a 0', 1;

  IF @cantidad_curvas IS NULL OR @cantidad_curvas < 0
    THROW 50003, 'La cantidad_curvas debe ser >= 0', 1;

  UPDATE dbo.CIRCUITO
  SET
    nombre = @nombre,
    distancia_total = @distancia_total,
    cantidad_curvas = @cantidad_curvas
  WHERE id_circuito = @id_circuito;
END;
GO

-- ============================
-- ELIMINAR
-- ============================
CREATE OR ALTER PROCEDURE dbo.sp_Circuitos_Eliminar
  @id_circuito INT
AS
BEGIN
  SET NOCOUNT ON;

  -- Existe?
  IF NOT EXISTS (SELECT 1 FROM dbo.CIRCUITO WHERE id_circuito = @id_circuito)
    THROW 51001, 'El circuito no existe', 1;

  -- Está en uso por simulaciones?
  IF EXISTS (SELECT 1 FROM dbo.SIMULACION WHERE id_circuito = @id_circuito)
    THROW 51002, 'No se puede eliminar: El circuito ya tiene simulaciones registradas', 1;

  DELETE FROM dbo.CIRCUITO
  WHERE id_circuito = @id_circuito;

  SELECT 'Circuito eliminado correctamente' AS mensaje;
END;
GO
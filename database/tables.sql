-- Script para crear las tablas de la base de datos F1GarageManager

USE F1GarageManager;
GO

-- 1) Tablas base

CREATE TABLE dbo.EQUIPO (
    id_equipo INT IDENTITY(1,1) PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    CONSTRAINT UQ_EQUIPO_nombre UNIQUE (nombre)
);
GO

CREATE TABLE dbo.USUARIO (
    id_usuario      INT IDENTITY(1,1) PRIMARY KEY,
    id_equipo       INT NULL,                 -- Solo aplica si rol = Engineer
    nombre_usuario  VARCHAR(80) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    rol             VARCHAR(20) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,

    CONSTRAINT UQ_USUARIO_nombre_usuario UNIQUE (nombre_usuario),
    CONSTRAINT CK_USUARIO_rol CHECK (rol IN ('Admin','Engineer','Driver')),

    -- Regla: Engineer -> id_equipo NOT NULL; Admin/Driver -> id_equipo NULL
    CONSTRAINT CK_USUARIO_engineer_equipo CHECK (
        (rol = 'Engineer' AND id_equipo IS NOT NULL) OR
        (rol IN ('Admin', 'Driver') AND id_equipo IS NULL)
    ),

    CONSTRAINT FK_USUARIO_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo)
);
GO

CREATE TABLE dbo.CONDUCTOR (
    id_usuario  INT PRIMARY KEY,  
    id_equipo   INT NOT NULL,
    habilidad_h INT NOT NULL,

    CONSTRAINT CK_CONDUCTOR_habilidad CHECK (habilidad_h BETWEEN 0 AND 100),

    CONSTRAINT FK_CONDUCTOR_USUARIO
        FOREIGN KEY (id_usuario) REFERENCES dbo.USUARIO(id_usuario),

    CONSTRAINT FK_CONDUCTOR_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo)
);
GO

CREATE TABLE dbo.CARRO (
    id_carro     INT IDENTITY(1,1) PRIMARY KEY,
    id_equipo    INT NOT NULL,
    id_conductor INT NULL,            -- Puede ser NULL si está Armando
    estado       VARCHAR(20) NOT NULL,

    CONSTRAINT CK_CARRO_estado CHECK (estado IN ('Armando','Finalizado')),

    CONSTRAINT CK_CARRO_finalizado_conductor CHECK (
        estado = 'Armando' OR
        (estado = 'Finalizado' AND id_conductor IS NOT NULL)
    ),

    CONSTRAINT FK_CARRO_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo),

    CONSTRAINT FK_CARRO_CONDUCTOR
        FOREIGN KEY (id_conductor) REFERENCES dbo.CONDUCTOR(id_usuario)

);
GO

-- Asegura que un conductor solo tenga un carro asignado cuando el carro está Finalizado
CREATE UNIQUE INDEX UX_CARRO_conductor_not_null
ON dbo.CARRO(id_conductor)
WHERE id_conductor IS NOT NULL;
GO

-- Para poder amarrar INSTALA al equipo dueño del carro (FK compuesta)
ALTER TABLE dbo.CARRO
ADD CONSTRAINT UQ_CARRO_idcarro_idequipo UNIQUE (id_carro, id_equipo);
GO

-- 2) Patrocinadores y aportes

CREATE TABLE dbo.PATROCINADOR (
    id_patrocinador INT IDENTITY(1,1) PRIMARY KEY,
    id_equipo       INT NOT NULL,
    nombre          VARCHAR(120) NOT NULL,

    CONSTRAINT UQ_PATROCINADOR_nombre UNIQUE (nombre),

    CONSTRAINT FK_PATROCINADOR_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo)
);
GO

-- Garantiza que el patrocinador esté aportando a su propio equipo
ALTER TABLE dbo.PATROCINADOR
ADD CONSTRAINT UQ_PATROCINADOR_idpat_ideq UNIQUE (id_patrocinador, id_equipo);
GO

CREATE TABLE dbo.APORTA (
    id_aporte       INT IDENTITY(1,1) PRIMARY KEY,
    id_equipo       INT NOT NULL,
    id_patrocinador INT NOT NULL,
    fecha           DATE NOT NULL,
    monto           DECIMAL(12,2) NOT NULL,
    descripcion     VARCHAR(255) NULL,

    CONSTRAINT CK_APORTA_monto CHECK (monto > 0),

    CONSTRAINT FK_APORTA_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo),

    CONSTRAINT FK_APORTA_PATROCINADOR
        FOREIGN KEY (id_patrocinador) REFERENCES dbo.PATROCINADOR(id_patrocinador),

    -- Asegura que el patrocinador del aporte pertenece a ESE mismo equipo
    CONSTRAINT FK_APORTA_PATROCINADOR_EQUIPO
        FOREIGN KEY (id_patrocinador, id_equipo)
        REFERENCES dbo.PATROCINADOR(id_patrocinador, id_equipo)
);
GO

-- 3) Categorías / Partes / Inventario (TIENE)

-- Categorías fijas (1..5)
CREATE TABLE dbo.CATEGORIA (
    id_categoria  INT PRIMARY KEY,
    tipo_de_parte VARCHAR(60) NOT NULL,

    CONSTRAINT UQ_CATEGORIA_tipo UNIQUE (tipo_de_parte),
    CONSTRAINT CK_CATEGORIA_id CHECK (id_categoria BETWEEN 1 AND 5)
);
GO

INSERT INTO dbo.CATEGORIA (id_categoria, tipo_de_parte) VALUES
(1,'Unidad de potencia'),
(2,'Paquete aerodinámico'),
(3,'Neumáticos'),
(4,'Suspensión'),
(5,'Caja de cambios');
GO

CREATE TABLE dbo.PARTE (
    id_parte        INT IDENTITY(1,1) PRIMARY KEY,
    id_categoria    INT NOT NULL,
    nombre          VARCHAR(120) NOT NULL,

    potencia        INT NOT NULL,
    aerodinamica    INT NOT NULL,
    manejo          INT NOT NULL,

    precio_catalogo DECIMAL(12,2) NOT NULL,
    stock           INT NOT NULL,

    CONSTRAINT CK_PARTE_p CHECK (potencia BETWEEN 0 AND 9),
    CONSTRAINT CK_PARTE_a CHECK (aerodinamica BETWEEN 0 AND 9),
    CONSTRAINT CK_PARTE_m CHECK (manejo BETWEEN 0 AND 9),
    CONSTRAINT CK_PARTE_precio CHECK (precio_catalogo >= 0),
    CONSTRAINT CK_PARTE_stock CHECK (stock >= 0),

    CONSTRAINT FK_PARTE_CATEGORIA
        FOREIGN KEY (id_categoria) REFERENCES dbo.CATEGORIA(id_categoria)
);
GO

-- la parte instalada corresponde a esa categoría
ALTER TABLE dbo.PARTE
ADD CONSTRAINT UQ_PARTE_idpar_idcat UNIQUE (id_parte, id_categoria);
GO

-- Inventario por equipo
CREATE TABLE dbo.TIENE (
    id_equipo       INT NOT NULL,
    id_parte        INT NOT NULL,
    cantidad        INT NOT NULL,
    fecha_adquirido DATE NULL,

    -- en el inventario de un equipo, una parte aparece una vez, solo se aunmenta cantidad
    CONSTRAINT PK_TIENE PRIMARY KEY (id_equipo, id_parte),
    CONSTRAINT CK_TIENE_cantidad CHECK (cantidad >= 0),

    CONSTRAINT FK_TIENE_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo),

    CONSTRAINT FK_TIENE_PARTE
        FOREIGN KEY (id_parte) REFERENCES dbo.PARTE(id_parte)
);
GO

-- 4) Compras

CREATE TABLE dbo.COMPRA (
    id_compra       INT IDENTITY(1,1) PRIMARY KEY,
    id_equipo       INT NOT NULL,
    fecha_de_compra DATE NOT NULL,
    precio_total    DECIMAL(12,2) NOT NULL,

    CONSTRAINT CK_COMPRA_precio_total CHECK (precio_total >= 0),

    CONSTRAINT FK_COMPRA_EQUIPO
        FOREIGN KEY (id_equipo) REFERENCES dbo.EQUIPO(id_equipo)
);
GO


CREATE TABLE dbo.COMPRA_DE (
    id_compra       INT NOT NULL,
    id_parte        INT NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    cantidad        INT NOT NULL,

    -- en una compra una parte aparece una vez, solo aunmentando cantidad
    CONSTRAINT PK_COMPRA_DE PRIMARY KEY (id_compra, id_parte),

    CONSTRAINT CK_COMPRA_DE_precio CHECK (precio_unitario >= 0),

    CONSTRAINT CK_COMPRA_DE_cantidad CHECK (cantidad > 0),

    CONSTRAINT FK_COMPRA_DE_COMPRA
        FOREIGN KEY (id_compra) REFERENCES dbo.COMPRA(id_compra),

    CONSTRAINT FK_COMPRA_DE_PARTE
        FOREIGN KEY (id_parte) REFERENCES dbo.PARTE(id_parte)
);
GO

-- 5) Circuitos / Simulación / Resultado

CREATE TABLE dbo.CIRCUITO (
    id_circuito     INT IDENTITY(1,1) PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    distancia_total DECIMAL(10,3) NOT NULL,
    cantidad_curvas INT NOT NULL,

    CONSTRAINT UQ_CIRCUITO_nombre UNIQUE (nombre),
    CONSTRAINT CK_CIRCUITO_dist CHECK (distancia_total > 0),
    CONSTRAINT CK_CIRCUITO_curvas CHECK (cantidad_curvas >= 0)
);
GO

ALTER TABLE dbo.CIRCUITO
ALTER COLUMN distancia_total DECIMAL(10,3) NOT NULL;

CREATE TABLE dbo.SIMULACION (
    id_simulacion INT IDENTITY(1,1) PRIMARY KEY,
    id_circuito   INT NOT NULL,
    fecha_hora    DATETIME2 NOT NULL,
    dc_global     DECIMAL(10,2) NOT NULL,

    CONSTRAINT CK_SIMULACION_dc CHECK (dc_global >= 0),

    CONSTRAINT FK_SIMULACION_CIRCUITO
        FOREIGN KEY (id_circuito) REFERENCES dbo.CIRCUITO(id_circuito)
);
GO


CREATE TABLE dbo.RESULTADO (
    id_simulacion INT NOT NULL,
    id_carro      INT NOT NULL,
    id_conductor  INT NOT NULL,
    posicion      INT NOT NULL,

    p_usado     INT NOT NULL DEFAULT 0,
    a_usado     INT NOT NULL DEFAULT 0,
    m_usado     INT NOT NULL DEFAULT 0,
    h_conductor INT NOT NULL DEFAULT 0,

    velocidad_recta DECIMAL(10,2) NULL,
    velocidad_curva DECIMAL(10,2) NULL,
    penalizacion    DECIMAL(10,2) NULL,
    tiempo_total    DECIMAL(10,3) NULL,

    CONSTRAINT PK_RESULTADO PRIMARY KEY (id_simulacion, id_carro),
    CONSTRAINT CK_RESULTADO_pos CHECK (posicion >= 1),
    CONSTRAINT CK_RESULTADO_p CHECK (p_usado BETWEEN 0 AND 45),
    CONSTRAINT CK_RESULTADO_a CHECK (a_usado BETWEEN 0 AND 45),
    CONSTRAINT CK_RESULTADO_m CHECK (m_usado BETWEEN 0 AND 45),
    CONSTRAINT CK_RESULTADO_h CHECK (h_conductor BETWEEN 0 AND 100),

    CONSTRAINT FK_RESULTADO_SIMULACION
        FOREIGN KEY (id_simulacion) REFERENCES dbo.SIMULACION(id_simulacion),

    CONSTRAINT FK_RESULTADO_CARRO
        FOREIGN KEY (id_carro) REFERENCES dbo.CARRO(id_carro),

    CONSTRAINT FK_RESULTADO_CONDUCTOR
        FOREIGN KEY (id_conductor) REFERENCES dbo.CONDUCTOR(id_usuario),

    -- no pueden existir dos carros con la misma posición
    CONSTRAINT UQ_RESULTADO_sim_pos UNIQUE (id_simulacion, posicion)
);
GO

-- 6) Instalación (armado)

CREATE TABLE dbo.INSTALA (
    id_carro          INT NOT NULL,
    id_categoria      INT NOT NULL,
    id_parte          INT NOT NULL,
    id_equipo         INT NOT NULL,
    fecha_instalacion DATE NOT NULL,

    -- 1 parte por categoría por carro
    CONSTRAINT PK_INSTALA PRIMARY KEY (id_carro, id_categoria),

    CONSTRAINT FK_INSTALA_CATEGORIA
        FOREIGN KEY (id_categoria) REFERENCES dbo.CATEGORIA(id_categoria),

    -- Carro pertenece al equipo
    CONSTRAINT FK_INSTALA_CARRO_EQUIPO
        FOREIGN KEY (id_carro, id_equipo) REFERENCES dbo.CARRO(id_carro, id_equipo),

    -- Parte debe ser de esa categoría 
    CONSTRAINT FK_INSTALA_PARTE_CATEGORIA
        FOREIGN KEY (id_parte, id_categoria) REFERENCES dbo.PARTE(id_parte, id_categoria),

    -- Para instalar una parte, esa parte debe existir en el inventario del equipo (TIENE).
    CONSTRAINT FK_INSTALA_TIENE
        FOREIGN KEY (id_equipo, id_parte) REFERENCES dbo.TIENE(id_equipo, id_parte)
);
GO


CREATE TABLE dbo.sessions (
    sid NVARCHAR(255) NOT NULL PRIMARY KEY,
    session NVARCHAR(MAX) NOT NULL,
    expires DATETIME NULL
);
GO

CREATE TABLE dbo.SIMULACION_SETUP (
  id_simulacion INT NOT NULL,
  id_carro INT NOT NULL,
  id_categoria INT NOT NULL,
  id_parte INT NOT NULL,

  potencia INT NOT NULL,
  aerodinamica INT NOT NULL,
  manejo INT NOT NULL,

  CONSTRAINT PK_SIM_SETUP PRIMARY KEY (id_simulacion, id_carro, id_categoria),
  CONSTRAINT FK_SIM_SETUP_SIM FOREIGN KEY (id_simulacion) REFERENCES dbo.SIMULACION(id_simulacion),
  CONSTRAINT FK_SIM_SETUP_CARRO FOREIGN KEY (id_carro) REFERENCES dbo.CARRO(id_carro),
  CONSTRAINT FK_SIM_SETUP_CAT FOREIGN KEY (id_categoria) REFERENCES dbo.CATEGORIA(id_categoria),
  CONSTRAINT FK_SIM_SETUP_PARTE_CAT FOREIGN KEY (id_parte, id_categoria) REFERENCES dbo.PARTE(id_parte, id_categoria),
);
GO

PRINT 'Tablas creadas exitosamente.';
GO
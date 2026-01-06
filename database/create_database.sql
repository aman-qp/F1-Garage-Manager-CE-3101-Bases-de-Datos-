-- Creación de la base de datos
USE master;
GO

IF DB_ID('F1GarageManager') IS NOT NULL
BEGIN
    ALTER DATABASE F1GarageManager SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE F1GarageManager;
END
GO

CREATE DATABASE F1GarageManager;
GO

USE F1GarageManager;
GO

PRINT 'Base de datos F1GarageManager creada exitosamente.';
GO



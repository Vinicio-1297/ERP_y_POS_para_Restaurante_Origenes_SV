
-- Clasificacion de productos del catalogo del POS.
-- Valores permitidos: elaborado o reventa.

IF OBJECT_ID('dbo.productos', 'U') IS NULL
BEGIN
    ;THROW 51001, 'No existe dbo.productos. Ejecuta primero las migraciones de POS.', 1;
END;
GO

IF COL_LENGTH('dbo.productos', 'tipo_producto') IS NULL
BEGIN
    ALTER TABLE dbo.productos
    ADD tipo_producto NVARCHAR(20) NOT NULL
        CONSTRAINT DF_productos_tipo_producto DEFAULT N'elaborado' WITH VALUES;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_productos_tipo_producto'
      AND parent_object_id = OBJECT_ID('dbo.productos')
)
BEGIN
    ALTER TABLE dbo.productos
    ADD CONSTRAINT CK_productos_tipo_producto
        CHECK (tipo_producto IN (N'elaborado', N'reventa'));
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_productos_tipo_activo'
      AND object_id = OBJECT_ID('dbo.productos')
)
BEGIN
    CREATE INDEX IX_productos_tipo_activo
        ON dbo.productos (tipo_producto, activo);
END;
GO


-- Frente 1: tablas de recetas e ingredientes.

IF OBJECT_ID('dbo.productos', 'U') IS NULL
BEGIN
    ;THROW 51002, 'No existe dbo.productos. Ejecuta primero las migraciones de POS.', 1;
END;

IF OBJECT_ID('dbo.insumos', 'U') IS NULL
BEGIN
    ;THROW 51003, 'No existe dbo.insumos. Ejecuta primero las migraciones de inventario.', 1;
END;
GO

-- Tabla principal de recetas.
IF OBJECT_ID('dbo.recetas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.recetas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        producto_id INT NOT NULL,
        rendimiento DECIMAL(18,3) NOT NULL DEFAULT 1,
        unidad_rendimiento NVARCHAR(20) NOT NULL DEFAULT N'porcion',
        instrucciones NVARCHAR(MAX) NULL,
        es_demo BIT NOT NULL DEFAULT 0,
        activo BIT NOT NULL DEFAULT 1,
        creado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        actualizado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_recetas_producto UNIQUE (producto_id),
        CONSTRAINT FK_recetas_producto
            FOREIGN KEY (producto_id) REFERENCES dbo.productos(id),
        CONSTRAINT CK_recetas_rendimiento
            CHECK (rendimiento > 0),
        CONSTRAINT CK_recetas_unidad
            CHECK (unidad_rendimiento IN (N'porcion', N'unidad', N'lote'))
    );
END;
GO

-- Tabla de ingredientes de cada receta.
IF OBJECT_ID('dbo.receta_detalles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.receta_detalles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        receta_id INT NOT NULL,
        insumo_id INT NOT NULL,
        cantidad DECIMAL(18,3) NOT NULL,
        unidad NVARCHAR(10) NOT NULL,
        creado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_receta_detalles_receta
            FOREIGN KEY (receta_id) REFERENCES dbo.recetas(id)
            ON DELETE CASCADE,

        CONSTRAINT FK_receta_detalles_insumo
            FOREIGN KEY (insumo_id) REFERENCES dbo.insumos(id),

        CONSTRAINT UQ_receta_detalles_receta_insumo
            UNIQUE (receta_id, insumo_id),

        CONSTRAINT CK_receta_detalles_cantidad
            CHECK (cantidad > 0),

        CONSTRAINT CK_receta_detalles_unidad
            CHECK (unidad IN (N'g', N'kg', N'ml', N'l', N'unidad'))
    );

    CREATE INDEX IX_receta_detalles_insumo
        ON dbo.receta_detalles (insumo_id);
END;
GO

-- Validar que solamente los productos elaborados tengan receta.
CREATE OR ALTER TRIGGER dbo.trg_recetas_validar_producto
ON dbo.recetas
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted r
        INNER JOIN dbo.productos p ON p.id = r.producto_id
        WHERE p.tipo_producto <> N'elaborado'
    )
    BEGIN
        THROW 51004,
            'Solo los productos elaborados pueden tener receta.', 1;
    END;
END;
GO

-- Validar que los ingredientes sean insumos activos
-- y que utilicen la misma unidad del inventario.
CREATE OR ALTER TRIGGER dbo.trg_receta_detalles_validar_insumo
ON dbo.receta_detalles
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted d
        INNER JOIN dbo.insumos i ON i.id = d.insumo_id
        WHERE i.tipo <> N'insumo'
           OR i.unidad <> d.unidad
           OR i.activo = 0
    )
    BEGIN
        THROW 51005,
            'El ingrediente debe ser un insumo activo y usar su unidad de inventario.', 1;
    END;
END;
GO

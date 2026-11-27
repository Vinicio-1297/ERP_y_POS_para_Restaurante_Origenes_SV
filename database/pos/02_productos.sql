-- Productos a la venta. El precio va en centavos enteros (280 = $2.80). Idempotente.
IF OBJECT_ID('dbo.productos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.productos (
    id           INT IDENTITY(1,1) CONSTRAINT PK_productos PRIMARY KEY,
    nombre       NVARCHAR(120) NOT NULL,
    precio_cents INT NOT NULL CONSTRAINT CK_productos_precio CHECK (precio_cents >= 0),
    categoria_id INT NOT NULL CONSTRAINT FK_productos_categoria REFERENCES dbo.categorias(id),
    imagen_url   NVARCHAR(400) NULL,
    sucursal     NVARCHAR(100) NOT NULL CONSTRAINT DF_productos_sucursal DEFAULT N'Restaurante',
    activo       BIT NOT NULL CONSTRAINT DF_productos_activo DEFAULT 1
  );
  CREATE INDEX IX_productos_categoria ON dbo.productos (categoria_id);
END
GO

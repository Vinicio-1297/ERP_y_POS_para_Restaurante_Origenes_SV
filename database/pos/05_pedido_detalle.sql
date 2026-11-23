-- Líneas de cada venta (un producto y su cantidad). Idempotente.
IF OBJECT_ID('dbo.pedido_detalle', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.pedido_detalle (
    id                INT IDENTITY(1,1) CONSTRAINT PK_pedido_detalle PRIMARY KEY,
    pedido_id         INT NOT NULL CONSTRAINT FK_detalle_pedido REFERENCES dbo.pedidos(id),
    producto_id       INT NOT NULL CONSTRAINT FK_detalle_producto REFERENCES dbo.productos(id),
    nombre_producto   NVARCHAR(120) NOT NULL,  -- copia del nombre al momento de la venta
    cantidad          INT NOT NULL CONSTRAINT CK_detalle_cantidad CHECK (cantidad > 0),
    precio_unit_cents INT NOT NULL CONSTRAINT CK_detalle_precio CHECK (precio_unit_cents >= 0),
    subtotal_cents    INT NOT NULL CONSTRAINT CK_detalle_subtotal CHECK (subtotal_cents >= 0)
  );
  CREATE INDEX IX_detalle_pedido ON dbo.pedido_detalle (pedido_id);
END
GO

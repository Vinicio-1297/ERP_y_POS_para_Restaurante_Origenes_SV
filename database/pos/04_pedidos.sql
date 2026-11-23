-- Encabezado de cada venta. Dinero en centavos enteros. Idempotente.
IF OBJECT_ID('dbo.pedidos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.pedidos (
    id                 INT IDENTITY(1,1) CONSTRAINT PK_pedidos PRIMARY KEY,
    numero             INT NOT NULL,
    sucursal           NVARCHAR(100) NOT NULL,
    tipo_servicio      VARCHAR(10) NOT NULL
      CONSTRAINT CK_pedidos_servicio CHECK (tipo_servicio IN ('llevar', 'aqui')),
    tipo_comprobante   VARCHAR(20) NOT NULL
      CONSTRAINT CK_pedidos_comprobante CHECK (tipo_comprobante IN ('consumidor-final', 'credito-fiscal')),
    numero_comprobante INT NOT NULL,
    metodo_pago        VARCHAR(10) NOT NULL
      CONSTRAINT CK_pedidos_pago CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'digital')),
    subtotal_cents     INT NOT NULL CONSTRAINT CK_pedidos_subtotal CHECK (subtotal_cents >= 0),
    iva_cents          INT NOT NULL CONSTRAINT CK_pedidos_iva CHECK (iva_cents >= 0),
    total_cents        INT NOT NULL CONSTRAINT CK_pedidos_total CHECK (total_cents >= 0),
    usuario_id         INT NULL,  -- sin FK todavía: la tabla de usuarios la crea Back B
    estado             VARCHAR(10) NOT NULL CONSTRAINT DF_pedidos_estado DEFAULT 'completado'
      CONSTRAINT CK_pedidos_estado CHECK (estado IN ('completado', 'anulado')),
    fecha              DATETIME2(0) NOT NULL CONSTRAINT DF_pedidos_fecha DEFAULT SYSUTCDATETIME(), -- UTC
    -- Estas dos restricciones garantizan que nunca haya números repetidos, aunque falle el código.
    CONSTRAINT UQ_pedidos_numero UNIQUE (sucursal, numero),
    CONSTRAINT UQ_pedidos_comprobante UNIQUE (sucursal, tipo_comprobante, numero_comprobante)
  );
  CREATE INDEX IX_pedidos_fecha ON dbo.pedidos (fecha);
END
GO

-- Agregada después de la primera versión: con qué se pagó cuando metodo_pago = 'digital'.
-- Queda NULL para efectivo, tarjeta o un pago digital sin detallar. Caja (cuadre) puede agrupar por esto.
IF COL_LENGTH('dbo.pedidos', 'proveedor_digital') IS NULL
BEGIN
  ALTER TABLE dbo.pedidos ADD proveedor_digital VARCHAR(10) NULL
    CONSTRAINT CK_pedidos_proveedor_digital CHECK (proveedor_digital IN ('bitcoin', 'chivo'));
END
GO

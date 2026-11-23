-- Un contador por tipo y sucursal: 'pedido', 'consumidor-final' y 'credito-fiscal'. Idempotente.
IF OBJECT_ID('dbo.correlativos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.correlativos (
    tipo     VARCHAR(30) NOT NULL,
    sucursal NVARCHAR(100) NOT NULL,
    ultimo   INT NOT NULL CONSTRAINT DF_correlativos_ultimo DEFAULT 0,
    CONSTRAINT PK_correlativos PRIMARY KEY (tipo, sucursal)
  );
END
GO

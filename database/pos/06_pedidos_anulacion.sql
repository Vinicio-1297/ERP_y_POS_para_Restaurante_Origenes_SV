-- Datos de la anulación de un pedido (A-13). El pedido NO se borra: queda con estado 'anulado'
-- y su número de comprobante no se reutiliza (un documento anulado sigue existiendo para efectos de control).
-- Idempotente: se puede correr varias veces.
IF COL_LENGTH('dbo.pedidos', 'anulado_en') IS NULL
BEGIN
  ALTER TABLE dbo.pedidos ADD
    anulado_en        DATETIME2(0) NULL,   -- UTC
    anulado_por       INT NULL,            -- id del usuario (sin FK: la tabla la crea Back B)
    motivo_anulacion  NVARCHAR(200) NULL;
END
GO

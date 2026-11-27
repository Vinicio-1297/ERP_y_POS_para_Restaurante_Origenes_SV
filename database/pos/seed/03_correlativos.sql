-- Contadores en cero: el primer pedido será el 0001 y el primer comprobante de cada tipo, el 1.
IF NOT EXISTS (SELECT 1 FROM dbo.correlativos WHERE tipo = 'pedido' AND sucursal = N'Restaurante')
  INSERT INTO dbo.correlativos (tipo, sucursal, ultimo) VALUES ('pedido', N'Restaurante', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.correlativos WHERE tipo = 'consumidor-final' AND sucursal = N'Restaurante')
  INSERT INTO dbo.correlativos (tipo, sucursal, ultimo) VALUES ('consumidor-final', N'Restaurante', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.correlativos WHERE tipo = 'credito-fiscal' AND sucursal = N'Restaurante')
  INSERT INTO dbo.correlativos (tipo, sucursal, ultimo) VALUES ('credito-fiscal', N'Restaurante', 0);
GO

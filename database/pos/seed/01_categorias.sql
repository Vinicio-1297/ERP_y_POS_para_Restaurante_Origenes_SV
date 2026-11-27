-- Ids fijos para que coincidan con el contrato (categoría 5 = Bebidas). Solo carga si la tabla está vacía.
IF NOT EXISTS (SELECT 1 FROM dbo.categorias)
BEGIN
  SET IDENTITY_INSERT dbo.categorias ON;
  INSERT INTO dbo.categorias (id, nombre) VALUES
    (1, N'Desayunos'),
    (2, N'Comida típica'),
    (3, N'Postres'),
    (4, N'Combos'),
    (5, N'Bebidas');
  SET IDENTITY_INSERT dbo.categorias OFF;
END
GO

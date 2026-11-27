-- 12 productos de ejemplo (el PDF pide mínimo 12 elaborados). Los precios son de ejemplo: ajústenlos al menú real.
-- Ids fijos para que coincidan con el contrato (id 2 = Té helado). Solo carga si la tabla está vacía.
IF NOT EXISTS (SELECT 1 FROM dbo.productos)
BEGIN
  SET IDENTITY_INSERT dbo.productos ON;
  INSERT INTO dbo.productos (id, nombre, precio_cents, categoria_id) VALUES
    (1,  N'Croissant de mantequilla',  280, 1),
    (2,  N'Té helado',                 280, 5),
    (3,  N'Combo de pupusas',          280, 4),
    (4,  N'Sopa de gallina',           450, 2),
    (5,  N'Pastel de tres leches',     320, 3),
    (6,  N'Desayuno típico',           395, 1),
    (7,  N'Latte Grande',              350, 5),
    (8,  N'Pupusas revueltas (3)',     300, 2),
    (9,  N'Yuca frita con chicharrón', 425, 2),
    (10, N'Atol de elote',             200, 5),
    (11, N'Quesadilla salvadoreña',    250, 3),
    (12, N'Combo desayuno y café',     495, 4);
  SET IDENTITY_INSERT dbo.productos OFF;
END
GO

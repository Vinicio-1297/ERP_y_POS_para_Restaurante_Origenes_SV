
-- Datos de demostracion del Frente 1.
-- Todas las cantidades son ficticias.

-- Marcar los 12 productos de ejemplo como elaborados.
UPDATE dbo.productos
SET tipo_producto = N'elaborado'
WHERE nombre IN (
    N'Croissant de mantequilla',
    N'Té helado',
    N'Combo de pupusas',
    N'Sopa de gallina',
    N'Pastel de tres leches',
    N'Desayuno típico',
    N'Latte Grande',
    N'Pupusas revueltas (3)',
    N'Yuca frita con chicharrón',
    N'Atol de elote',
    N'Quesadilla salvadoreña',
    N'Combo desayuno y café'
)
AND tipo_producto <> N'elaborado';
GO

-- Crear las recetas si todavía no existen.
INSERT INTO dbo.recetas (
    producto_id,
    rendimiento,
    unidad_rendimiento,
    instrucciones,
    es_demo
)
SELECT
    p.id,
    1,
    N'porcion',
    N'Receta de demostracion. Ajustar cantidades segun la preparacion real.',
    1
FROM dbo.productos p
WHERE p.nombre IN (
    N'Croissant de mantequilla',
    N'Té helado',
    N'Combo de pupusas',
    N'Sopa de gallina',
    N'Pastel de tres leches',
    N'Desayuno típico',
    N'Latte Grande',
    N'Pupusas revueltas (3)',
    N'Yuca frita con chicharrón',
    N'Atol de elote',
    N'Quesadilla salvadoreña',
    N'Combo desayuno y café'
)
AND p.tipo_producto = N'elaborado'
AND NOT EXISTS (
    SELECT 1
    FROM dbo.recetas r
    WHERE r.producto_id = p.id
);
GO

-- Ingredientes ficticios por porcion.
WITH datos (producto, insumo, cantidad, unidad) AS (
    SELECT * FROM (VALUES

        -- Croissant
        (N'Croissant de mantequilla', N'Harina de maiz', 120.000, N'g'),
        (N'Croissant de mantequilla', N'Huevos', 1.000, N'unidad'),
        (N'Croissant de mantequilla', N'Leche', 30.000, N'ml'),

        -- Te helado
        (N'Té helado', N'Cafe', 12.000, N'g'),
        (N'Té helado', N'Azucar', 15.000, N'g'),

        -- Combo de pupusas
        (N'Combo de pupusas', N'Harina de maiz', 180.000, N'g'),
        (N'Combo de pupusas', N'Queso', 90.000, N'g'),
        (N'Combo de pupusas', N'Frijoles', 60.000, N'g'),
        (N'Combo de pupusas', N'Repollo', 40.000, N'g'),

        -- Sopa de gallina
        (N'Sopa de gallina', N'Pollo', 250.000, N'g'),
        (N'Sopa de gallina', N'Arroz', 60.000, N'g'),
        (N'Sopa de gallina', N'Tomate', 40.000, N'g'),
        (N'Sopa de gallina', N'Sal', 3.000, N'g'),

        -- Pastel de tres leches
        (N'Pastel de tres leches', N'Harina de maiz', 100.000, N'g'),
        (N'Pastel de tres leches', N'Huevos', 2.000, N'unidad'),
        (N'Pastel de tres leches', N'Leche', 100.000, N'ml'),
        (N'Pastel de tres leches', N'Azucar', 40.000, N'g'),

        -- Desayuno tipico
        (N'Desayuno típico', N'Huevos', 2.000, N'unidad'),
        (N'Desayuno típico', N'Frijoles', 80.000, N'g'),
        (N'Desayuno típico', N'Arroz', 80.000, N'g'),
        (N'Desayuno típico', N'Pan', 1.000, N'unidad'),

        -- Latte grande
        (N'Latte Grande', N'Cafe', 18.000, N'g'),
        (N'Latte Grande', N'Leche', 250.000, N'ml'),
        (N'Latte Grande', N'Azucar', 10.000, N'g'),

        -- Pupusas revueltas
        (N'Pupusas revueltas (3)', N'Harina de maiz', 240.000, N'g'),
        (N'Pupusas revueltas (3)', N'Queso', 100.000, N'g'),
        (N'Pupusas revueltas (3)', N'Frijoles', 70.000, N'g'),
        (N'Pupusas revueltas (3)', N'Chicharron', 70.000, N'g'),
        (N'Pupusas revueltas (3)', N'Repollo', 50.000, N'g'),

        -- Yuca frita
        (N'Yuca frita con chicharrón', N'Chicharron', 120.000, N'g'),
        (N'Yuca frita con chicharrón', N'Aceite vegetal', 30.000, N'ml'),
        (N'Yuca frita con chicharrón', N'Repollo', 40.000, N'g'),
        (N'Yuca frita con chicharrón', N'Tomate', 30.000, N'g'),

        -- Atol de elote
        (N'Atol de elote', N'Harina de maiz', 100.000, N'g'),
        (N'Atol de elote', N'Leche', 200.000, N'ml'),
        (N'Atol de elote', N'Azucar', 25.000, N'g'),

        -- Quesadilla salvadoreña
        (N'Quesadilla salvadoreña', N'Harina de maiz', 100.000, N'g'),
        (N'Quesadilla salvadoreña', N'Queso', 50.000, N'g'),
        (N'Quesadilla salvadoreña', N'Huevos', 1.000, N'unidad'),
        (N'Quesadilla salvadoreña', N'Leche', 50.000, N'ml'),
        (N'Quesadilla salvadoreña', N'Azucar', 25.000, N'g'),

        -- Combo desayuno y cafe
        (N'Combo desayuno y café', N'Huevos', 2.000, N'unidad'),
        (N'Combo desayuno y café', N'Frijoles', 80.000, N'g'),
        (N'Combo desayuno y café', N'Pan', 1.000, N'unidad'),
        (N'Combo desayuno y café', N'Cafe', 12.000, N'g'),
        (N'Combo desayuno y café', N'Leche', 80.000, N'ml')

    ) AS v(producto, insumo, cantidad, unidad)
)

INSERT INTO dbo.receta_detalles (
    receta_id,
    insumo_id,
    cantidad,
    unidad
)
SELECT
    r.id,
    i.id,
    d.cantidad,
    d.unidad
FROM datos d
INNER JOIN dbo.productos p
    ON p.nombre = d.producto
INNER JOIN dbo.recetas r
    ON r.producto_id = p.id
INNER JOIN dbo.insumos i
    ON i.nombre = d.insumo
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.receta_detalles rd
    WHERE rd.receta_id = r.id
      AND rd.insumo_id = i.id
);
GO

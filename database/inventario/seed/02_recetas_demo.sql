-- recetas ficticias para los productos del menu
-- las cantidades corresponden al rendimiento completo de cada receta

set xact_abort on;

begin try
    begin transaction;

    declare @recetas table (
        producto nvarchar(120) primary key,
        rendimiento decimal(18,3),
        unidad nvarchar(20),
        instrucciones nvarchar(500)
    );

    insert into @recetas
    values
        (N'Croissant de mantequilla', 10, N'unidad',
         N'Preparar la masa, laminar con mantequilla, fermentar y hornear 10 croissants.'),

        (N'Té helado', 1, N'porcion',
         N'Preparar la infusion, endulzar y servir con hielo y limon.'),

        (N'Combo de pupusas', 1, N'porcion',
         N'Preparar tres pupusas y servir con curtido, salsa y te helado.'),

        (N'Sopa de gallina', 4, N'porcion',
         N'Cocinar el pollo con vegetales y servir cuatro porciones con arroz.'),

        (N'Pastel de tres leches', 8, N'porcion',
         N'Hornear el bizcocho, incorporar las tres leches y dividir en ocho porciones.'),

        (N'Desayuno típico', 1, N'porcion',
         N'Preparar huevos, frijoles, platano frito, queso, crema y pan.'),

        (N'Latte Grande', 1, N'porcion',
         N'Preparar el espresso y agregar leche vaporizada.'),

        (N'Pupusas revueltas (3)', 1, N'porcion',
         N'Preparar tres pupusas revueltas y servir con curtido y salsa.'),

        (N'Yuca frita con chicharrón', 1, N'porcion',
         N'Cocinar y freir la yuca, servir con chicharron y curtido.'),

        (N'Atol de elote', 4, N'porcion',
         N'Licuar el elote, cocinar con leche y servir cuatro vasos.'),

        (N'Quesadilla salvadoreña', 8, N'porcion',
         N'Preparar la mezcla, agregar ajonjoli, hornear y dividir en ocho porciones.'),

        (N'Combo desayuno y café', 1, N'porcion',
         N'Preparar un desayuno tipico y servir con cafe.');

    declare @ingredientes table (
        producto nvarchar(120),
        insumo nvarchar(120),
        cantidad decimal(18,3),
        unidad nvarchar(10),
        primary key (producto, insumo)
    );

    insert into @ingredientes
    values

        -- croissant de mantequilla: 10 unidades
        (N'Croissant de mantequilla', N'Harina de trigo', 500, 'g'),
        (N'Croissant de mantequilla', N'Mantequilla', 280, 'g'),
        (N'Croissant de mantequilla', N'Leche', 150, 'ml'),
        (N'Croissant de mantequilla', N'Agua', 120, 'ml'),
        (N'Croissant de mantequilla', N'Levadura', 10, 'g'),
        (N'Croissant de mantequilla', N'Azucar', 50, 'g'),
        (N'Croissant de mantequilla', N'Sal', 10, 'g'),
        (N'Croissant de mantequilla', N'Huevos', 2, 'unidad'),

        -- te helado: 1 vaso
        (N'Té helado', N'Te', 3, 'g'),
        (N'Té helado', N'Agua', 250, 'ml'),
        (N'Té helado', N'Azucar', 20, 'g'),
        (N'Té helado', N'Limon', 20, 'g'),
        (N'Té helado', N'Hielo', 100, 'g'),

        -- combo de tres pupusas con bebida
        (N'Combo de pupusas', N'Harina de maiz', 180, 'g'),
        (N'Combo de pupusas', N'Agua', 470, 'ml'),
        (N'Combo de pupusas', N'Queso', 90, 'g'),
        (N'Combo de pupusas', N'Frijoles', 60, 'g'),
        (N'Combo de pupusas', N'Chicharron', 60, 'g'),
        (N'Combo de pupusas', N'Repollo', 60, 'g'),
        (N'Combo de pupusas', N'Zanahoria', 15, 'g'),
        (N'Combo de pupusas', N'Cebolla', 15, 'g'),
        (N'Combo de pupusas', N'Vinagre', 15, 'ml'),
        (N'Combo de pupusas', N'Oregano', 1, 'g'),
        (N'Combo de pupusas', N'Tomate', 60, 'g'),
        (N'Combo de pupusas', N'Ajo', 3, 'g'),
        (N'Combo de pupusas', N'Sal', 4, 'g'),
        (N'Combo de pupusas', N'Aceite vegetal', 5, 'ml'),
        (N'Combo de pupusas', N'Te', 3, 'g'),
        (N'Combo de pupusas', N'Azucar', 20, 'g'),
        (N'Combo de pupusas', N'Limon', 20, 'g'),
        (N'Combo de pupusas', N'Hielo', 100, 'g'),

        -- sopa de gallina: 4 porciones
        (N'Sopa de gallina', N'Pollo', 1000, 'g'),
        (N'Sopa de gallina', N'Agua', 2000, 'ml'),
        (N'Sopa de gallina', N'Arroz', 240, 'g'),
        (N'Sopa de gallina', N'Papa', 400, 'g'),
        (N'Sopa de gallina', N'Zanahoria', 200, 'g'),
        (N'Sopa de gallina', N'Elote', 240, 'g'),
        (N'Sopa de gallina', N'Tomate', 160, 'g'),
        (N'Sopa de gallina', N'Cebolla', 100, 'g'),
        (N'Sopa de gallina', N'Ajo', 12, 'g'),
        (N'Sopa de gallina', N'Cilantro', 20, 'g'),
        (N'Sopa de gallina', N'Sal', 12, 'g'),
        (N'Sopa de gallina', N'Pimienta', 4, 'g'),

        -- pastel de tres leches: 8 porciones
        (N'Pastel de tres leches', N'Harina de trigo', 240, 'g'),
        (N'Pastel de tres leches', N'Huevos', 8, 'unidad'),
        (N'Pastel de tres leches', N'Azucar', 200, 'g'),
        (N'Pastel de tres leches', N'Leche', 400, 'ml'),
        (N'Pastel de tres leches', N'Leche condensada', 320, 'ml'),
        (N'Pastel de tres leches', N'Leche evaporada', 360, 'ml'),
        (N'Pastel de tres leches', N'Polvo de hornear', 8, 'g'),
        (N'Pastel de tres leches', N'Vainilla', 8, 'ml'),
        (N'Pastel de tres leches', N'Crema', 240, 'ml'),

        -- desayuno tipico: 1 plato
        (N'Desayuno típico', N'Huevos', 2, 'unidad'),
        (N'Desayuno típico', N'Frijoles', 80, 'g'),
        (N'Desayuno típico', N'Platano', 150, 'g'),
        (N'Desayuno típico', N'Queso', 40, 'g'),
        (N'Desayuno típico', N'Crema', 30, 'ml'),
        (N'Desayuno típico', N'Pan', 1, 'unidad'),
        (N'Desayuno típico', N'Aceite vegetal', 20, 'ml'),
        (N'Desayuno típico', N'Sal', 2, 'g'),

        -- latte grande: 1 vaso
        (N'Latte Grande', N'Cafe', 18, 'g'),
        (N'Latte Grande', N'Agua', 40, 'ml'),
        (N'Latte Grande', N'Leche', 300, 'ml'),

        -- pupusas revueltas: 3 unidades
        (N'Pupusas revueltas (3)', N'Harina de maiz', 180, 'g'),
        (N'Pupusas revueltas (3)', N'Agua', 220, 'ml'),
        (N'Pupusas revueltas (3)', N'Queso', 90, 'g'),
        (N'Pupusas revueltas (3)', N'Frijoles', 60, 'g'),
        (N'Pupusas revueltas (3)', N'Chicharron', 60, 'g'),
        (N'Pupusas revueltas (3)', N'Repollo', 60, 'g'),
        (N'Pupusas revueltas (3)', N'Zanahoria', 15, 'g'),
        (N'Pupusas revueltas (3)', N'Cebolla', 15, 'g'),
        (N'Pupusas revueltas (3)', N'Vinagre', 15, 'ml'),
        (N'Pupusas revueltas (3)', N'Oregano', 1, 'g'),
        (N'Pupusas revueltas (3)', N'Tomate', 60, 'g'),
        (N'Pupusas revueltas (3)', N'Ajo', 3, 'g'),
        (N'Pupusas revueltas (3)', N'Sal', 4, 'g'),
        (N'Pupusas revueltas (3)', N'Aceite vegetal', 5, 'ml'),

        -- yuca frita con chicharron: 1 plato
        (N'Yuca frita con chicharrón', N'Yuca', 250, 'g'),
        (N'Yuca frita con chicharrón', N'Chicharron', 120, 'g'),
        (N'Yuca frita con chicharrón', N'Aceite vegetal', 30, 'ml'),
        (N'Yuca frita con chicharrón', N'Agua', 500, 'ml'),
        (N'Yuca frita con chicharrón', N'Repollo', 60, 'g'),
        (N'Yuca frita con chicharrón', N'Zanahoria', 15, 'g'),
        (N'Yuca frita con chicharrón', N'Cebolla', 15, 'g'),
        (N'Yuca frita con chicharrón', N'Tomate', 40, 'g'),
        (N'Yuca frita con chicharrón', N'Vinagre', 15, 'ml'),
        (N'Yuca frita con chicharrón', N'Oregano', 1, 'g'),
        (N'Yuca frita con chicharrón', N'Sal', 3, 'g'),

        -- atol de elote: 4 vasos
        (N'Atol de elote', N'Elote', 600, 'g'),
        (N'Atol de elote', N'Leche', 800, 'ml'),
        (N'Atol de elote', N'Agua', 400, 'ml'),
        (N'Atol de elote', N'Azucar', 100, 'g'),
        (N'Atol de elote', N'Canela', 4, 'g'),
        (N'Atol de elote', N'Sal', 2, 'g'),

        -- quesadilla salvadorena: 8 porciones
        (N'Quesadilla salvadoreña', N'Harina de arroz', 320, 'g'),
        (N'Quesadilla salvadoreña', N'Queso', 240, 'g'),
        (N'Quesadilla salvadoreña', N'Huevos', 4, 'unidad'),
        (N'Quesadilla salvadoreña', N'Leche', 200, 'ml'),
        (N'Quesadilla salvadoreña', N'Crema', 160, 'ml'),
        (N'Quesadilla salvadoreña', N'Mantequilla', 160, 'g'),
        (N'Quesadilla salvadoreña', N'Azucar', 200, 'g'),
        (N'Quesadilla salvadoreña', N'Polvo de hornear', 8, 'g'),
        (N'Quesadilla salvadoreña', N'Ajonjoli', 24, 'g'),

        -- combo desayuno y cafe: 1 combo
        (N'Combo desayuno y café', N'Huevos', 2, 'unidad'),
        (N'Combo desayuno y café', N'Frijoles', 80, 'g'),
        (N'Combo desayuno y café', N'Platano', 150, 'g'),
        (N'Combo desayuno y café', N'Queso', 40, 'g'),
        (N'Combo desayuno y café', N'Crema', 30, 'ml'),
        (N'Combo desayuno y café', N'Pan', 1, 'unidad'),
        (N'Combo desayuno y café', N'Aceite vegetal', 20, 'ml'),
        (N'Combo desayuno y café', N'Sal', 2, 'g'),
        (N'Combo desayuno y café', N'Cafe', 15, 'g'),
        (N'Combo desayuno y café', N'Agua', 250, 'ml');

    -- comprobar que todos los productos existen
    if exists (
        select 1
        from @recetas d
        where not exists (
            select 1
            from dbo.productos p
            where p.nombre = d.producto
        )
    )
        throw 51010, 'Faltan productos del menu de demostracion.', 1;

    -- comprobar que todos los ingredientes son validos
    if exists (
        select 1
        from @ingredientes d
        where not exists (
            select 1
            from dbo.insumos i
            where i.nombre = d.insumo
                and i.unidad = d.unidad
                and i.tipo = N'insumo'
                and i.activo = 1
        )
    )
        throw 51011, 'Faltan insumos activos o existen unidades incompatibles.', 1;

    -- marcar como elaborados los productos sin receta real
    update p
    set p.tipo_producto = N'elaborado'
    from dbo.productos p
    inner join @recetas d
        on d.producto = p.nombre
    where p.tipo_producto <> N'elaborado'
        and not exists (
            select 1
            from dbo.recetas r
            where r.producto_id = p.id
                and r.es_demo = 0
        );

    -- crear las recetas que todavia no existen
    insert into dbo.recetas (
        producto_id,
        rendimiento,
        unidad_rendimiento,
        instrucciones,
        es_demo
    )
    select
        p.id,
        d.rendimiento,
        d.unidad,
        d.instrucciones,
        1
    from @recetas d
    inner join dbo.productos p
        on p.nombre = d.producto
    where not exists (
        select 1
        from dbo.recetas r
        where r.producto_id = p.id
    );

    -- actualizar solamente las recetas de demostracion
    update r
    set
        r.rendimiento = d.rendimiento,
        r.unidad_rendimiento = d.unidad,
        r.instrucciones = d.instrucciones,
        r.actualizado_en = sysutcdatetime()
    from dbo.recetas r
    inner join dbo.productos p
        on p.id = r.producto_id
    inner join @recetas d
        on d.producto = p.nombre
    where r.es_demo = 1
        and (
            r.rendimiento <> d.rendimiento
            or r.unidad_rendimiento <> d.unidad
            or isnull(r.instrucciones, N'') <> d.instrucciones
        );

    -- retirar ingredientes incorrectos de las recetas demo
    delete rd
    from dbo.receta_detalles rd
    inner join dbo.recetas r
        on r.id = rd.receta_id
    inner join dbo.productos p
        on p.id = r.producto_id
    inner join @recetas d
        on d.producto = p.nombre
    inner join dbo.insumos i
        on i.id = rd.insumo_id
    where r.es_demo = 1
        and not exists (
            select 1
            from @ingredientes ing
            where ing.producto = p.nombre
                and ing.insumo = i.nombre
        );

    -- corregir las cantidades de los ingredientes existentes
    update rd
    set
        rd.cantidad = d.cantidad,
        rd.unidad = d.unidad
    from dbo.receta_detalles rd
    inner join dbo.recetas r
        on r.id = rd.receta_id
    inner join dbo.productos p
        on p.id = r.producto_id
    inner join dbo.insumos i
        on i.id = rd.insumo_id
    inner join @ingredientes d
        on d.producto = p.nombre
        and d.insumo = i.nombre
    where r.es_demo = 1
        and (
            rd.cantidad <> d.cantidad
            or rd.unidad <> d.unidad
        );

    -- agregar los ingredientes faltantes
    insert into dbo.receta_detalles (
        receta_id,
        insumo_id,
        cantidad,
        unidad
    )
    select
        r.id,
        i.id,
        d.cantidad,
        d.unidad
    from @ingredientes d
    inner join dbo.productos p
        on p.nombre = d.producto
    inner join dbo.recetas r
        on r.producto_id = p.id
    inner join dbo.insumos i
        on i.nombre = d.insumo
    where r.es_demo = 1
        and not exists (
            select 1
            from dbo.receta_detalles rd
            where rd.receta_id = r.id
                and rd.insumo_id = i.id
        );

    commit transaction;

end try
begin catch
    if @@trancount > 0
        rollback transaction;

    throw;
end catch;
go
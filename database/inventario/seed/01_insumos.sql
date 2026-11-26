-- datos iniciales de los insumos
insert into dbo.insumos (nombre, tipo, categoria, unidad)
select datos.nombre, 'insumo', datos.categoria, datos.unidad
from (
    values
        -- granos y harinas
        (N'Harina de maiz', N'Granos y harinas', 'g'),
        (N'Harina de trigo', N'Granos y harinas', 'g'),
        (N'Harina de arroz', N'Granos y harinas', 'g'),
        (N'Frijoles', N'Granos y harinas', 'g'),
        (N'Arroz', N'Granos y harinas', 'g'),

        -- lacteos
        (N'Queso', N'Lacteos', 'g'),
        (N'Leche', N'Lacteos', 'ml'),
        (N'Mantequilla', N'Lacteos', 'g'),
        (N'Leche condensada', N'Lacteos', 'ml'),
        (N'Leche evaporada', N'Lacteos', 'ml'),
        (N'Crema', N'Lacteos', 'ml'),

        -- carnes y proteinas
        (N'Chicharron', N'Carnes', 'g'),
        (N'Pollo', N'Carnes', 'g'),
        (N'Huevos', N'Proteinas', 'unidad'),

        -- vegetales
        (N'Tomate', N'Vegetales', 'g'),
        (N'Cebolla', N'Vegetales', 'g'),
        (N'Repollo', N'Vegetales', 'g'),
        (N'Zanahoria', N'Vegetales', 'g'),
        (N'Papa', N'Vegetales', 'g'),
        (N'Yuca', N'Vegetales', 'g'),
        (N'Elote', N'Vegetales', 'g'),
        (N'Platano', N'Vegetales', 'g'),
        (N'Ajo', N'Vegetales', 'g'),
        (N'Cilantro', N'Vegetales', 'g'),

        -- aceites y condimentos
        (N'Aceite vegetal', N'Aceites', 'ml'),
        (N'Sal', N'Condimentos', 'g'),
        (N'Azucar', N'Condimentos', 'g'),
        (N'Vinagre', N'Condimentos', 'ml'),
        (N'Oregano', N'Condimentos', 'g'),
        (N'Canela', N'Condimentos', 'g'),
        (N'Vainilla', N'Condimentos', 'ml'),
        (N'Pimienta', N'Condimentos', 'g'),

        -- bebidas
        (N'Cafe', N'Bebidas', 'g'),
        (N'Te', N'Bebidas', 'g'),
        (N'Agua', N'Bebidas', 'ml'),
        (N'Limon', N'Frutas', 'g'),
        (N'Hielo', N'Bebidas', 'g'),

        -- panaderia y reposteria
        (N'Pan', N'Panaderia', 'unidad'),
        (N'Levadura', N'Panaderia', 'g'),
        (N'Polvo de hornear', N'Panaderia', 'g'),
        (N'Ajonjoli', N'Panaderia', 'g')

) as datos(nombre, categoria, unidad)
where not exists (
    select 1
    from dbo.insumos i
    where i.nombre = datos.nombre
);
go

-- crear las existencias iniciales por sucursal
insert into dbo.existencias (
    insumo_id,
    sucursal_id,
    cantidad,
    stock_minimo
)
select
    i.id,
    s.id,
    0,
    case i.unidad
        when 'g' then 1000
        when 'ml' then 1000
        when 'unidad' then 10
        else 1
    end
from dbo.insumos i
cross join dbo.sucursales s
where i.activo = 1
    and s.activo = 1
    and not exists (
        select 1
        from dbo.existencias e
        where e.insumo_id = i.id
            and e.sucursal_id = s.id
    );
go
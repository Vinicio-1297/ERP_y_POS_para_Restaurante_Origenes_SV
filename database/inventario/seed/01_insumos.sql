-- datos iniciales de los insumos
insert into dbo.insumos (nombre, tipo, categoria, unidad)
select datos.nombre, 'insumo', datos.categoria, datos.unidad
from (
    values
        (N'Harina de maiz', N'Granos y harinas', 'g'),
        (N'Queso', N'Lacteos', 'g'),
        (N'Frijoles', N'Granos y harinas', 'g'),
        (N'Chicharron', N'Carnes', 'g'),
        (N'Aceite vegetal', N'Aceites', 'ml'),
        (N'Tomate', N'Vegetales', 'g'),
        (N'Cebolla', N'Vegetales', 'g'),
        (N'Repollo', N'Vegetales', 'g'),
        (N'Sal', N'Condimentos', 'g'),
        (N'Azucar', N'Condimentos', 'g'),
        (N'Cafe', N'Bebidas', 'g'),
        (N'Leche', N'Lacteos', 'ml'),
        (N'Huevos', N'Proteinas', 'unidad'),
        (N'Pollo', N'Carnes', 'g'),
        (N'Arroz', N'Granos y harinas', 'g'),
        (N'Pan', N'Panaderia', 'unidad')
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
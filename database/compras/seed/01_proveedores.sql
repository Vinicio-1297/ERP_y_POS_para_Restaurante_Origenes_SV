-- proveedores ficticios para las pruebas del sistema
insert into dbo.proveedores (
    razon_social,
    nombre_comercial,
    contacto,
    correo,
    direccion,
    observaciones,
    activo
)
select
    datos.razon_social,
    datos.nombre_comercial,
    datos.contacto,
    datos.correo,
    datos.direccion,
    datos.observaciones,
    1
from (
    values
        (
            N'Distribuidora de Granos Demo',
            N'Granos Demo',
            N'Contacto de ventas',
            N'granos@example.com',
            N'San Salvador',
            N'Proveedor de harina, arroz y frijoles.'
        ),
        (
            N'Productos Lacteos Demo',
            N'Lacteos Demo',
            N'Contacto de ventas',
            N'lacteos@example.com',
            N'Santa Tecla',
            N'Proveedor de leche y queso.'
        ),
        (
            N'Distribuidora de Carnes Demo',
            N'Carnes Demo',
            N'Contacto de ventas',
            N'carnes@example.com',
            N'San Salvador',
            N'Proveedor de pollo y chicharron.'
        ),
        (
            N'Vegetales y Frutas Demo',
            N'Vegetales Demo',
            N'Contacto de ventas',
            N'vegetales@example.com',
            N'Aguilares',
            N'Proveedor de vegetales frescos.'
        ),
        (
            N'Suministros Alimenticios Demo',
            N'Suministros Demo',
            N'Contacto de ventas',
            N'suministros@example.com',
            N'Antiguo Cuscatlan',
            N'Proveedor de aceite, sal, azucar y cafe.'
        )
) as datos (
    razon_social,
    nombre_comercial,
    contacto,
    correo,
    direccion,
    observaciones
)
where not exists (
    select 1
    from dbo.proveedores p
    where p.razon_social = datos.razon_social
);
go
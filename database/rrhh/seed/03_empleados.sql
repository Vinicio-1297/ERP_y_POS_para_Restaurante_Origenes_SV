-- empleados ficticios para las pruebas del sistema
insert into dbo.empleados (
    nombres,
    apellidos,
    dui,
    cargo_id,
    sucursal_id,
    salario_mensual_cents,
    fecha_ingreso,
    correo,
    activo
)
select
    datos.nombres,
    datos.apellidos,
    datos.dui,
    c.id,
    s.id,
    datos.salario,
    datos.fecha_ingreso,
    datos.correo,
    1
from (
    values
        (
            N'Empleado Demo',
            N'Barista Uno',
            '00000001-0',
            N'Barista',
            45000,
            '2026-01-05',
            N'barista1@example.com'
        ),
        (
            N'Empleado Demo',
            N'Barista Dos',
            '00000002-0',
            N'Barista',
            45000,
            '2026-02-02',
            N'barista2@example.com'
        ),
        (
            N'Empleado Demo',
            N'Cajero Uno',
            '00000003-0',
            N'Cajero',
            50000,
            '2026-01-05',
            N'cajero1@example.com'
        ),
        (
            N'Empleado Demo',
            N'Cajero Dos',
            '00000004-0',
            N'Cajero',
            50000,
            '2026-03-02',
            N'cajero2@example.com'
        ),
        (
            N'Empleado Demo',
            N'Gerente',
            '00000005-0',
            N'Gerente',
            90000,
            '2026-01-05',
            N'gerente@example.com'
        )
) as datos (
    nombres,
    apellidos,
    dui,
    cargo,
    salario,
    fecha_ingreso,
    correo
)
inner join dbo.cargos c
    on c.nombre = datos.cargo
inner join dbo.sucursales s
    on s.nombre = N'Restaurante'
where not exists (
    select 1
    from dbo.empleados e
    where e.dui = datos.dui
);
go
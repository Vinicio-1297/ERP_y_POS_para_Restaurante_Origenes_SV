-- empleados del restaurante. Un empleado NO es lo mismo que un usuario:
-- un barista puede no tener login, por eso usuario_id es opcional.
if object_id('dbo.empleados', 'U') is null
begin
    create table dbo.empleados (
        id int identity(1,1) primary key,
        nombres nvarchar(80) not null,
        apellidos nvarchar(80) not null,
        dui varchar(10) not null,
        nit varchar(17) null,
        cargo_id int not null,
        sucursal_id int null,
        salario_mensual_cents int not null,
        fecha_ingreso date not null,
        telefono varchar(20) null,
        correo nvarchar(150) null,
        usuario_id int null,
        activo bit not null default 1,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint ck_empleados_salario
            check (salario_mensual_cents > 0),
        constraint ck_empleados_dui
            check (dui like '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9]'),
        constraint fk_empleados_cargo
            foreign key (cargo_id) references dbo.cargos(id),
        constraint fk_empleados_sucursal
            foreign key (sucursal_id) references dbo.sucursales(id),
        constraint fk_empleados_usuario
            foreign key (usuario_id) references dbo.usuarios(id)
    );
end;
go

-- el DUI no se repite
if not exists (select 1 from sys.indexes where name = 'ux_empleados_dui' and object_id = object_id('dbo.empleados'))
    create unique index ux_empleados_dui on dbo.empleados (dui);
go

-- el NIT no se repite, pero es opcional (por eso el filtro)
if not exists (select 1 from sys.indexes where name = 'ux_empleados_nit' and object_id = object_id('dbo.empleados'))
    create unique index ux_empleados_nit on dbo.empleados (nit) where nit is not null;
go

-- un usuario del sistema pertenece a un solo empleado
if not exists (select 1 from sys.indexes where name = 'ux_empleados_usuario' and object_id = object_id('dbo.empleados'))
    create unique index ux_empleados_usuario on dbo.empleados (usuario_id) where usuario_id is not null;
go
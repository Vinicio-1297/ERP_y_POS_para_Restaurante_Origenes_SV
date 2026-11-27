-- encabezado de cada planilla quincenal. sucursal_id null = planilla de toda la empresa.
if object_id('dbo.planillas', 'U') is null
begin
    create table dbo.planillas (
        id int identity(1,1) primary key,
        anio smallint not null,
        mes tinyint not null,
        quincena tinyint not null,
        sucursal_id int null,
        periodo_inicio date not null,
        periodo_fin date not null,
        cantidad_empleados int not null,
        total_bruto_cents int not null,
        total_isss_cents int not null,
        total_afp_cents int not null,
        total_renta_cents int not null,
        total_neto_cents int not null,
        generada_por int null,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint ck_planillas_mes check (mes between 1 and 12),
        constraint ck_planillas_quincena check (quincena in (1, 2)),
        constraint fk_planillas_sucursal
            foreign key (sucursal_id) references dbo.sucursales(id),
        constraint fk_planillas_usuario
            foreign key (generada_por) references dbo.usuarios(id)
    );
end;
go

-- aunque falle el código, la base no deja generar la misma quincena dos veces
if not exists (select 1 from sys.indexes where name = 'ux_planillas_general' and object_id = object_id('dbo.planillas'))
    create unique index ux_planillas_general on dbo.planillas (anio, mes, quincena) where sucursal_id is null;
go

if not exists (select 1 from sys.indexes where name = 'ux_planillas_sucursal' and object_id = object_id('dbo.planillas'))
    create unique index ux_planillas_sucursal on dbo.planillas (anio, mes, quincena, sucursal_id) where sucursal_id is not null;
go
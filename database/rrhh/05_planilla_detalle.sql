-- una fila por empleado en cada planilla. Guarda una COPIA del nombre, DUI y cargo:
if object_id('dbo.planilla_detalle', 'U') is null
begin
    create table dbo.planilla_detalle (
        id int identity(1,1) primary key,
        planilla_id int not null,
        empleado_id int not null,
        nombre_empleado nvarchar(170) not null,
        dui varchar(10) not null,
        cargo nvarchar(50) not null,
        salario_mensual_cents int not null,
        salario_quincenal_cents int not null,
        isss_cents int not null,
        afp_cents int not null,
        base_renta_cents int not null,
        renta_cents int not null,
        neto_cents int not null,

        constraint uq_detalle_planilla_empleado unique (planilla_id, empleado_id),
        constraint fk_detalle_planilla
            foreign key (planilla_id) references dbo.planillas(id),
        constraint fk_detalle_empleado
            foreign key (empleado_id) references dbo.empleados(id)
    );
end;
go
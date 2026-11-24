-- turnos de caja: un cajero abre un turno, vende, y lo cierra con el cuadre
if object_id('dbo.turnos_caja', 'U') is null
begin
    create table dbo.turnos_caja (
        id int identity(1,1) primary key,
        usuario_id int not null,
        sucursal_id int null,
        estado varchar(10) not null default 'abierto',
        monto_apertura_cents int not null,
        fecha_apertura datetime2 not null default sysutcdatetime(),
        fecha_cierre datetime2 null,

        -- lo que el sistema calculó al cerrar
        efectivo_esperado_cents int null,
        tarjeta_esperada_cents int null,
        digital_esperado_cents int null,

        -- lo que el cajero contó o declaró al cerrar
        efectivo_contado_cents int null,
        tarjeta_declarada_cents int null,
        digital_declarado_cents int null,

        observaciones nvarchar(300) null,

        constraint ck_turnos_estado
            check (estado in ('abierto', 'cerrado')),
        constraint ck_turnos_apertura
            check (monto_apertura_cents >= 0),
        constraint fk_turnos_usuario
            foreign key (usuario_id) references dbo.usuarios(id),
        constraint fk_turnos_sucursal
            foreign key (sucursal_id) references dbo.sucursales(id)
    );
end;
go

-- una sola caja abierta por usuario: lo garantiza la base de datos
if not exists (
    select 1 from sys.indexes
    where name = 'ux_turno_abierto_por_usuario'
      and object_id = object_id('dbo.turnos_caja')
)
begin
    create unique index ux_turno_abierto_por_usuario
        on dbo.turnos_caja (usuario_id)
        where estado = 'abierto';
end;
go
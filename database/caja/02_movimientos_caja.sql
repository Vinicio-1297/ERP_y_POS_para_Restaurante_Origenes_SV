-- ingresos y egresos de efectivo durante un turno
if object_id('dbo.movimientos_caja', 'U') is null
begin
    create table dbo.movimientos_caja (
        id int identity(1,1) primary key,
        turno_id int not null,
        tipo varchar(10) not null,
        monto_cents int not null,
        concepto nvarchar(200) not null,
        fecha datetime2 not null default sysutcdatetime(),

        constraint ck_movimientos_caja_tipo
            check (tipo in ('ingreso', 'egreso')),
        constraint ck_movimientos_caja_monto
            check (monto_cents > 0),
        constraint fk_movimientos_caja_turno
            foreign key (turno_id) references dbo.turnos_caja(id)
    );
end;
go
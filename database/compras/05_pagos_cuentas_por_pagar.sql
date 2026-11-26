-- guardar el historial de abonos de cada cuenta por pagar
if object_id('dbo.pagos_cuentas_por_pagar', 'U') is null
begin
    create table dbo.pagos_cuentas_por_pagar (
        id int identity(1,1) primary key,
        cuenta_id int not null,
        usuario_id int not null,
        monto_cents int not null,
        fecha_pago date not null,
        metodo_pago nvarchar(20) not null,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint FK_pagos_cuentas_por_pagar_cuenta
            foreign key (cuenta_id)
            references dbo.cuentas_por_pagar(id),

        constraint FK_pagos_cuentas_por_pagar_usuario
            foreign key (usuario_id)
            references dbo.usuarios(id),

        constraint CK_pagos_cuentas_por_pagar_monto
            check (monto_cents > 0),

        constraint CK_pagos_cuentas_por_pagar_metodo
            check (
                metodo_pago in (
                    'efectivo',
                    'transferencia',
                    'tarjeta'
                )
            )
    );
end;
go

-- facilitar la consulta del historial de abonos
if not exists (
    select 1
    from sys.indexes
    where name = 'IX_pagos_cuentas_por_pagar_cuenta'
      and object_id = object_id('dbo.pagos_cuentas_por_pagar')
)
begin
    create index IX_pagos_cuentas_por_pagar_cuenta
        on dbo.pagos_cuentas_por_pagar(
            cuenta_id,
            fecha_pago desc,
            id desc
        )
        include (monto_cents, metodo_pago, usuario_id);
end;
go
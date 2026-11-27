-- almacenar las cuentas por pagar de los proveedores
if object_id('dbo.cuentas_por_pagar', 'U') is null
begin
    create table dbo.cuentas_por_pagar (
        id int identity(1,1) primary key,
        compra_id int null,
        proveedor_id int not null,
        usuario_id int not null,
        factura nvarchar(100) not null,
        fecha date not null,
        vencimiento date not null,
        total_cents int not null,
        saldo_cents int not null,
        creado_en datetime2 not null default sysutcdatetime(),
        actualizado_en datetime2 not null default sysutcdatetime(),

        constraint FK_cuentas_por_pagar_compra
            foreign key (compra_id)
            references dbo.compras(id),

        constraint FK_cuentas_por_pagar_proveedor
            foreign key (proveedor_id)
            references dbo.proveedores(id),

        constraint FK_cuentas_por_pagar_usuario
            foreign key (usuario_id)
            references dbo.usuarios(id),

        constraint CK_cuentas_por_pagar_importes
            check (
                total_cents > 0
                and saldo_cents >= 0
                and saldo_cents <= total_cents
            ),

        constraint CK_cuentas_por_pagar_fechas
            check (vencimiento >= fecha),

        constraint CK_cuentas_por_pagar_factura
            check (len(ltrim(rtrim(factura))) > 0),

        constraint UQ_cuentas_por_pagar_factura
            unique (proveedor_id, factura)
    );
end;
go

-- evitar que una compra genere mas de una cuenta por pagar
if not exists (
    select 1
    from sys.indexes
    where name = 'UX_cuentas_por_pagar_compra'
      and object_id = object_id('dbo.cuentas_por_pagar')
)
begin
    create unique index UX_cuentas_por_pagar_compra
        on dbo.cuentas_por_pagar(compra_id)
        where compra_id is not null;
end;
go

-- facilitar las consultas de cuentas pendientes y vencidas
if not exists (
    select 1
    from sys.indexes
    where name = 'IX_cuentas_por_pagar_vencimiento'
      and object_id = object_id('dbo.cuentas_por_pagar')
)
begin
    create index IX_cuentas_por_pagar_vencimiento
        on dbo.cuentas_por_pagar(vencimiento)
        include (proveedor_id, total_cents, saldo_cents)
        where saldo_cents > 0;
end;
go
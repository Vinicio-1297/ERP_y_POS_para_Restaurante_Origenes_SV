-- agregar los datos de facturacion a las compras
if col_length('dbo.compras', 'condicion_pago') is null
begin
    alter table dbo.compras
    add condicion_pago nvarchar(20) null;
end;
go

if col_length('dbo.compras', 'factura') is null
begin
    alter table dbo.compras
    add factura nvarchar(100) null;
end;
go

if col_length('dbo.compras', 'fecha_factura') is null
begin
    alter table dbo.compras
    add fecha_factura date null;
end;
go

if col_length('dbo.compras', 'vencimiento') is null
begin
    alter table dbo.compras
    add vencimiento date null;
end;
go

-- establecer contado como valor predeterminado para nuevas compras
if object_id('dbo.DF_compras_condicion_pago', 'D') is null
begin
    alter table dbo.compras
    add constraint DF_compras_condicion_pago
        default 'contado' for condicion_pago;
end;
go

-- validar las condiciones de pago
if object_id('dbo.CK_compras_condicion_pago', 'C') is null
begin
    alter table dbo.compras
    add constraint CK_compras_condicion_pago
        check (
            condicion_pago in ('contado', 'credito')
        );
end;
go

-- validar los datos de las compras a credito
if object_id('dbo.CK_compras_datos_credito', 'C') is null
begin
    alter table dbo.compras
    add constraint CK_compras_datos_credito
        check (
            condicion_pago is null
            or (
                condicion_pago = 'contado'
                and vencimiento is null
            )
            or (
                condicion_pago = 'credito'
                and factura is not null
                and len(ltrim(rtrim(factura))) > 0
                and fecha_factura is not null
                and vencimiento is not null
                and vencimiento >= fecha_factura
                and total_cents > 0
            )
        );
end;
go

-- evitar facturas repetidas para un mismo proveedor
if not exists (
    select 1
    from sys.indexes
    where name = 'UX_compras_proveedor_factura'
      and object_id = object_id('dbo.compras')
)
begin
    create unique index UX_compras_proveedor_factura
        on dbo.compras(proveedor_id, factura)
        where factura is not null;
end;
go
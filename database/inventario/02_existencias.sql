-- existencias de cada articulo por sucursal
if object_id('dbo.existencias', 'U') is null
begin
    create table dbo.existencias (
        insumo_id int not null,
        sucursal_id int not null,
        cantidad decimal(18,3) not null default 0,
        stock_minimo decimal(18,3) not null default 0,
        actualizado_en datetime2 not null default sysutcdatetime(),

        constraint PK_existencias
            primary key (insumo_id, sucursal_id),

        constraint FK_existencias_insumo
            foreign key (insumo_id)
            references dbo.insumos(id),

        constraint FK_existencias_sucursal
            foreign key (sucursal_id)
            references dbo.sucursales(id),

        constraint CK_existencias_cantidad
            check (cantidad >= 0),

        constraint CK_existencias_stock_minimo
            check (stock_minimo >= 0)
    );

    create index IX_existencias_sucursal
        on dbo.existencias (sucursal_id)
        include (cantidad, stock_minimo);
end;
go
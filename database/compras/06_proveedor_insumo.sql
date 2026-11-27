-- insumos que puede suministrar cada proveedor
if object_id('dbo.proveedor_insumo', 'U') is null
begin
    create table dbo.proveedor_insumo (
        proveedor_id int not null,
        insumo_id int not null,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint pk_proveedor_insumo
            primary key (proveedor_id, insumo_id),

        constraint fk_proveedor_insumo_proveedor
            foreign key (proveedor_id)
            references dbo.proveedores(id),

        constraint fk_proveedor_insumo_insumo
            foreign key (insumo_id)
            references dbo.insumos(id)
    );

    create index ix_proveedor_insumo_insumo
        on dbo.proveedor_insumo(insumo_id);
end;
go
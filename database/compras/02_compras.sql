
-- encabezado de compras
if object_id('dbo.compras', 'U') is null
begin
    create table dbo.compras (
        id int identity(1,1) primary key,
        proveedor_id int not null,
        sucursal_id int not null,
        usuario_id int not null,
        fecha_compra datetime2 not null default sysutcdatetime(),
        estado nvarchar(20) not null default 'pendiente',
        subtotal_cents int not null default 0,
        total_cents int not null default 0,
        observaciones nvarchar(500) null,
        recibido_en datetime2 null,
        recibido_por int null,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint CK_compras_estado
            check (estado in ('pendiente', 'recibida', 'anulada')),

        constraint CK_compras_importes
            check (
                subtotal_cents >= 0
                and total_cents >= 0
                and total_cents = subtotal_cents
            ),

        constraint CK_compras_recepcion
            check (
                (estado = 'recibida' and recibido_en is not null and recibido_por is not null)
                or
                (estado <> 'recibida' and recibido_en is null and recibido_por is null)
            ),

        constraint FK_compras_proveedor
            foreign key (proveedor_id)
            references dbo.proveedores(id),

        constraint FK_compras_sucursal
            foreign key (sucursal_id)
            references dbo.sucursales(id),

        constraint FK_compras_usuario
            foreign key (usuario_id)
            references dbo.usuarios(id),

        constraint FK_compras_recibido_por
            foreign key (recibido_por)
            references dbo.usuarios(id)
    );
end;
go

-- detalle de los insumos incluidos en cada compra
if object_id('dbo.compra_detalles', 'U') is null
begin
    create table dbo.compra_detalles (
        id int identity(1,1) primary key,
        compra_id int not null,
        insumo_id int not null,
        cantidad decimal(18,3) not null,
        costo_unitario_cents int not null,
        subtotal_cents int not null,

        constraint CK_compra_detalles_cantidad
            check (cantidad > 0),

        constraint CK_compra_detalles_costos
            check (
                costo_unitario_cents >= 0
                and subtotal_cents >= 0
            ),

        constraint FK_compra_detalles_compra
            foreign key (compra_id)
            references dbo.compras(id),

        constraint FK_compra_detalles_insumo
            foreign key (insumo_id)
            references dbo.insumos(id),

        constraint UQ_compra_detalles_insumo
            unique (compra_id, insumo_id)
    );
end;
go

-- consultar compras por fecha y estado
if not exists (
    select 1
    from sys.indexes
    where name = 'IX_compras_fecha_estado'
      and object_id = object_id('dbo.compras')
)
begin
    create index IX_compras_fecha_estado
        on dbo.compras(fecha_compra desc, estado)
        include (proveedor_id, sucursal_id, total_cents);
end;
go

-- consultar el historial de compras de un proveedor
if not exists (
    select 1
    from sys.indexes
    where name = 'IX_compras_proveedor'
      and object_id = object_id('dbo.compras')
)
begin
    create index IX_compras_proveedor
        on dbo.compras(proveedor_id, fecha_compra desc);
end;
go

-- consultar los detalles de una compra
if not exists (
    select 1
    from sys.indexes
    where name = 'IX_compra_detalles_compra'
      and object_id = object_id('dbo.compra_detalles')
)
begin
    create index IX_compra_detalles_compra
        on dbo.compra_detalles(compra_id);
end;
go

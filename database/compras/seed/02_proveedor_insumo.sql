-- registrar si ya se inicializo el catalogo de cada proveedor
if object_id(N'dbo.proveedor_catalogo_seed', N'U') is null
begin
    create table dbo.proveedor_catalogo_seed (
        proveedor_id int not null primary key,
        inicializado_en datetime2 not null default sysutcdatetime(),

        constraint fk_proveedor_catalogo_seed
            foreign key (proveedor_id)
            references dbo.proveedores(id)
    );
end;
go

set xact_abort on;

begin try
    begin transaction;

    -- identificar los proveedores pendientes de inicializar
    declare @pendientes table (
        proveedor_id int primary key
    );

    insert into @pendientes (proveedor_id)
    select p.id
    from dbo.proveedores p
    where p.activo = 1
        and p.razon_social in (
            N'Distribuidora de Granos Demo',
            N'Productos Lacteos Demo',
            N'Distribuidora de Carnes Demo',
            N'Vegetales y Frutas Demo',
            N'Suministros Alimenticios Demo'
        )
        and not exists (
            select 1
            from dbo.proveedor_catalogo_seed s
            where s.proveedor_id = p.id
        );

    -- inicializar solamente los catalogos nuevos
    insert into dbo.proveedor_insumo (
        proveedor_id,
        insumo_id
    )
    select distinct
        p.id,
        i.id
    from (
        values
            (N'Distribuidora de Granos Demo', N'Granos y harinas'),
            (N'Distribuidora de Granos Demo', N'Panaderia'),

            (N'Productos Lacteos Demo', N'Lacteos'),

            (N'Distribuidora de Carnes Demo', N'Carnes'),
            (N'Distribuidora de Carnes Demo', N'Proteinas'),

            (N'Vegetales y Frutas Demo', N'Vegetales'),
            (N'Vegetales y Frutas Demo', N'Frutas'),

            (N'Suministros Alimenticios Demo', N'Aceites'),
            (N'Suministros Alimenticios Demo', N'Condimentos'),
            (N'Suministros Alimenticios Demo', N'Bebidas')
    ) as datos(proveedor, categoria)
    inner join dbo.proveedores p
        on p.razon_social = datos.proveedor
    inner join @pendientes pe
        on pe.proveedor_id = p.id
    inner join dbo.insumos i
        on i.categoria = datos.categoria
    where i.tipo = 'insumo'
        and i.activo = 1
        and not exists (
            select 1
            from dbo.proveedor_insumo pi
            where pi.proveedor_id = p.id
                and pi.insumo_id = i.id
        )
        and not exists (
            select 1
            from dbo.proveedor_insumo pi
            where pi.proveedor_id = p.id
        );

    -- marcar los catalogos como inicializados
    insert into dbo.proveedor_catalogo_seed (
        proveedor_id
    )
    select proveedor_id
    from @pendientes;

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;

    throw;
end catch;
go
-- abastecimiento inicial para las pruebas del restaurante
set xact_abort on;

begin try
    begin transaction;

    declare @stock table (
        insumo nvarchar(120) primary key,
        cantidad decimal(18,3),
        minimo decimal(18,3)
    );

    insert into @stock
    values
        -- granos y harinas
        (N'Harina de maiz', 25000, 5000),
        (N'Harina de trigo', 20000, 4000),
        (N'Harina de arroz', 10000, 2000),
        (N'Frijoles', 20000, 4000),
        (N'Arroz', 15000, 3000),

        -- lacteos
        (N'Queso', 15000, 3000),
        (N'Leche', 30000, 6000),
        (N'Mantequilla', 8000, 1500),
        (N'Leche condensada', 8000, 1500),
        (N'Leche evaporada', 8000, 1500),
        (N'Crema', 10000, 2000),

        -- carnes y proteinas
        (N'Chicharron', 15000, 3000),
        (N'Pollo', 25000, 5000),
        (N'Huevos', 300, 60),

        -- vegetales
        (N'Tomate', 12000, 2000),
        (N'Cebolla', 8000, 1500),
        (N'Repollo', 10000, 2000),
        (N'Zanahoria', 8000, 1500),
        (N'Papa', 12000, 2000),
        (N'Yuca', 20000, 4000),
        (N'Elote', 15000, 3000),
        (N'Platano', 15000, 3000),
        (N'Ajo', 2000, 300),
        (N'Cilantro', 1000, 200),

        -- aceites y condimentos
        (N'Aceite vegetal', 20000, 4000),
        (N'Sal', 5000, 1000),
        (N'Azucar', 15000, 3000),
        (N'Vinagre', 5000, 1000),
        (N'Oregano', 500, 100),
        (N'Canela', 500, 100),
        (N'Vainilla', 1000, 200),
        (N'Pimienta', 500, 100),

        -- bebidas
        (N'Cafe', 10000, 2000),
        (N'Te', 2000, 400),
        (N'Agua', 200000, 40000),
        (N'Limon', 8000, 1500),
        (N'Hielo', 30000, 5000),

        -- panaderia y reposteria
        (N'Pan', 200, 40),
        (N'Levadura', 1000, 200),
        (N'Polvo de hornear', 1000, 200),
        (N'Ajonjoli', 1000, 200);

    declare @sucursal_id int;

    select @sucursal_id = id
    from dbo.sucursales
    where nombre = N'Restaurante'
        and activo = 1;

    if @sucursal_id is null
        throw 51020, 'No existe la sucursal de demostracion activa.', 1;

    -- comprobar que todos los insumos tienen existencias
    if exists (
        select 1
        from @stock d
        where not exists (
            select 1
            from dbo.insumos i
            inner join dbo.existencias e
                on e.insumo_id = i.id
            where i.nombre = d.insumo
                and i.activo = 1
                and i.tipo = N'insumo'
                and e.sucursal_id = @sucursal_id
        )
    )
        throw 51021, 'Faltan insumos o existencias de demostracion.', 1;

    -- guardar las existencias que se abastecieron
    declare @movimientos table (
        insumo_id int,
        sucursal_id int,
        stock_anterior decimal(18,3),
        stock_nuevo decimal(18,3)
    );

    -- abastecer solamente existencias sin actividad previa
    update e
    set
        e.cantidad = d.cantidad,
        e.stock_minimo = d.minimo,
        e.actualizado_en = sysutcdatetime()
    output
        inserted.insumo_id,
        inserted.sucursal_id,
        deleted.cantidad,
        inserted.cantidad
    into @movimientos
    from dbo.existencias e with (updlock, holdlock)
    inner join dbo.insumos i
        on i.id = e.insumo_id
    inner join @stock d
        on d.insumo = i.nombre
    where e.sucursal_id = @sucursal_id
        and e.cantidad = 0
        and i.activo = 1
        and i.tipo = N'insumo'
        and not exists (
            select 1
            from dbo.movimientos_inventario m
            where m.insumo_id = e.insumo_id
                and m.sucursal_id = e.sucursal_id
        );

    -- registrar las entradas iniciales en el historial
    insert into dbo.movimientos_inventario (
        insumo_id,
        sucursal_id,
        usuario_id,
        tipo,
        cantidad,
        stock_anterior,
        stock_nuevo,
        referencia_tipo,
        referencia_id,
        motivo
    )
    select
        insumo_id,
        sucursal_id,
        null,
        N'entrada',
        stock_nuevo - stock_anterior,
        stock_anterior,
        stock_nuevo,
        N'seed_demo',
        null,
        N'Abastecimiento inicial de demostracion'
    from @movimientos;

    commit transaction;

end try
begin catch
    if @@trancount > 0
        rollback transaction;

    throw;
end catch;
go
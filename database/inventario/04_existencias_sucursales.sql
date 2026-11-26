-- generar existencias al registrar o activar una sucursal
create or alter trigger dbo.trg_sucursales_existencias
on dbo.sucursales
after insert, update
as
begin
    set nocount on;

    insert into dbo.existencias (
        insumo_id,
        sucursal_id,
        cantidad,
        stock_minimo
    )
    select
        i.id,
        s.id,
        0,
        0
    from inserted s
    cross join dbo.insumos i
    where s.activo = 1
        and i.activo = 1
        and not exists (
            select 1
            from dbo.existencias e with (updlock, holdlock)
            where e.insumo_id = i.id
                and e.sucursal_id = s.id
        );
end;
go

-- completar las existencias faltantes de sucursales existentes
insert into dbo.existencias (
    insumo_id,
    sucursal_id,
    cantidad,
    stock_minimo
)
select
    i.id,
    s.id,
    0,
    0
from dbo.insumos i
cross join dbo.sucursales s
where i.activo = 1
    and s.activo = 1
    and not exists (
        select 1
        from dbo.existencias e with (updlock, holdlock)
        where e.insumo_id = i.id
            and e.sucursal_id = s.id
    );
go
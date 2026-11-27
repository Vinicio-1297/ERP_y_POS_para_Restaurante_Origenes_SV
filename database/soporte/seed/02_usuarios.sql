-- obtener la sucursal inicial
declare @sucursal_id int;

select @sucursal_id = id
from dbo.sucursales
where nombre = N'Restaurante';

-- insertar administrador
if not exists (
    select 1 from dbo.usuarios
    where correo = N'admin@origenes.sv'
)
begin
    insert into dbo.usuarios
        (sucursal_id, nombre, correo, password_hash, rol)
    values (
        null,
        N'Administrador',
        N'admin@origenes.sv',
        N'$2b$12$T2.M/7P4q3/BKWttNqo4KObLeCdlyFTAG3p2p6OnJyzBSG/ug64la',
        N'administrador'
    );
end;

-- insertar gerente
if not exists (
    select 1 from dbo.usuarios
    where correo = N'gerente@origenes.sv'
)
begin
    insert into dbo.usuarios
        (sucursal_id, nombre, correo, password_hash, rol)
    values (
        @sucursal_id,
        N'Gerente',
        N'gerente@origenes.sv',
        N'$2b$12$SqZe9QMnPUhIE5bCy/pYT..bssaShwZanp2MEVVzlxpLe1YoCDn.C',
        N'gerente'
    );
end;

-- insertar cajero
if not exists (
    select 1 from dbo.usuarios
    where correo = N'cajero@origenes.sv'
)
begin
    insert into dbo.usuarios
        (sucursal_id, nombre, correo, password_hash, rol)
    values (
        @sucursal_id,
        N'Cajero',
        N'cajero@origenes.sv',
        N'$2b$12$lNZAqmEiCl4SqtOX9r2Xw.Z0VMjUGDHb0uvTrUSPhaqOLdoT4dWmy',
        N'cajero'
    );
end;
go
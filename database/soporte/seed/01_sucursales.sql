-- insertar sucursal inicial
if not exists (
    select 1 from dbo.sucursales
    where nombre = N'Restaurante'
)
begin
    insert into dbo.sucursales (nombre, direccion)
    values (N'Restaurante', N'San Salvador');
end;
go
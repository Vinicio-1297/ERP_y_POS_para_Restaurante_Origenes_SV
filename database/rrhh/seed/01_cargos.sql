-- El restaurante solo maneja los cargos Cajero y Gerente.
if not exists (select 1 from dbo.cargos where nombre = N'Cajero')
    insert into dbo.cargos (nombre) values (N'Cajero');
if not exists (select 1 from dbo.cargos where nombre = N'Gerente')
    insert into dbo.cargos (nombre) values (N'Gerente');

-- Bases creadas antes: el cargo Barista deja de ofrecerse (no se borra para no romper empleados existentes).
update dbo.cargos set activo = 0 where nombre = N'Barista' and activo = 1;
go

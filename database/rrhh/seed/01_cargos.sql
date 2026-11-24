if not exists (select 1 from dbo.cargos where nombre = N'Barista')
    insert into dbo.cargos (nombre) values (N'Barista');
if not exists (select 1 from dbo.cargos where nombre = N'Cajero')
    insert into dbo.cargos (nombre) values (N'Cajero');
if not exists (select 1 from dbo.cargos where nombre = N'Gerente')
    insert into dbo.cargos (nombre) values (N'Gerente');
go
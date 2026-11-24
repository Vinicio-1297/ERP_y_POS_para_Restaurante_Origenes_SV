-- cargos del personal: barista, cajero, gerente
if object_id('dbo.cargos', 'U') is null
begin
    create table dbo.cargos (
        id int identity(1,1) primary key,
        nombre nvarchar(50) not null unique,
        activo bit not null default 1
    );
end;
go
-- cargos del personal: cajero y gerente (el cargo Barista ya no se usa)
if object_id('dbo.cargos', 'U') is null
begin
    create table dbo.cargos (
        id int identity(1,1) primary key,
        nombre nvarchar(50) not null unique,
        activo bit not null default 1
    );
end;
go
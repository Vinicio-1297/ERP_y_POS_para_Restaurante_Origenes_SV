-- crear tabla de sucursales si no existe
if object_id('dbo.sucursales', 'U') is null
begin
    create table dbo.sucursales (
        id int identity(1,1) primary key,
        nombre nvarchar(100) not null unique,
        direccion nvarchar(250) not null,
        telefono nvarchar(20) null,
        activo bit not null default 1,
        creado_en datetime2 not null default sysutcdatetime()
    );
end;
go
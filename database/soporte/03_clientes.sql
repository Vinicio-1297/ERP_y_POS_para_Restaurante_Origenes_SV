-- crear tabla de clientes si no existe
if object_id('dbo.clientes', 'U') is null
begin
    create table dbo.clientes (
        id int identity(1,1) primary key,
        nombre nvarchar(150) not null,
        nit nvarchar(20) null,
        nrc nvarchar(20) null,
        giro nvarchar(200) null,
        direccion nvarchar(250) null,
        correo nvarchar(150) null,
        telefono nvarchar(20) null,
        activo bit not null default 1,
        creado_en datetime2 not null default sysutcdatetime()
    );

    -- evitar documentos fiscales duplicados
    create unique index ux_clientes_nit
        on dbo.clientes(nit)
        where nit is not null;

    create unique index ux_clientes_nrc
        on dbo.clientes(nrc)
        where nrc is not null;
end;
go
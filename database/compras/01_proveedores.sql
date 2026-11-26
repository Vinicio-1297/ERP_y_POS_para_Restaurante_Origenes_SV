
-- catalogo de proveedores
if object_id('dbo.proveedores', 'U') is null
begin
    create table dbo.proveedores (
        id int identity(1,1) primary key,
        razon_social nvarchar(150) not null,
        nombre_comercial nvarchar(150) null,
        nit nvarchar(20) null,
        nrc nvarchar(20) null,
        contacto nvarchar(100) null,
        telefono nvarchar(20) null,
        correo nvarchar(150) null,
        direccion nvarchar(250) null,
        observaciones nvarchar(500) null,
        activo bit not null default 1,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint CK_proveedores_razon_social
            check (len(ltrim(rtrim(razon_social))) > 0)
    );
end;
go

-- evitar NIT duplicados
if not exists (
    select 1
    from sys.indexes
    where name = 'UX_proveedores_nit'
      and object_id = object_id('dbo.proveedores')
)
begin
    create unique index UX_proveedores_nit
        on dbo.proveedores(nit)
        where nit is not null;
end;
go

-- evitar NRC duplicados
if not exists (
    select 1
    from sys.indexes
    where name = 'UX_proveedores_nrc'
      and object_id = object_id('dbo.proveedores')
)
begin
    create unique index UX_proveedores_nrc
        on dbo.proveedores(nrc)
        where nrc is not null;
end;
go

-- facilitar la busqueda de proveedores activos
if not exists (
    select 1
    from sys.indexes
    where name = 'IX_proveedores_activo'
      and object_id = object_id('dbo.proveedores')
)
begin
    create index IX_proveedores_activo
        on dbo.proveedores(activo, razon_social);
end;
go

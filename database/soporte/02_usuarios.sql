--crear tabla de usuarios si no existe
if object_id('dbo.usuarios', 'U') is null
begin
    create table dbo.usuarios (
        id int identity(1,1) primary key,
        sucursal_id int null,
        nombre nvarchar(100) not null,
        correo nvarchar(150) not null unique,
        password_hash nvarchar(100) not null,
        rol nvarchar(20) not null,
        activo bit not null default 1,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint ck_usuarios_rol
            check (rol in ('administrador', 'gerente', 'cajero')),
        constraint fk_usuarios_sucursal
            foreign key (sucursal_id)
            references dbo.sucursales(id)
    );
end;
go
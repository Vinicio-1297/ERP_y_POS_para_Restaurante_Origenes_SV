-- catalogo de articulos del inventario
if object_id('dbo.insumos', 'U') is null
begin
    create table dbo.insumos (
        id int identity(1,1) primary key,
        nombre nvarchar(120) not null,
        tipo nvarchar(20) not null default 'insumo',
        categoria nvarchar(100) not null,
        unidad nvarchar(10) not null,
        codigo nvarchar(50) null,
        precio_venta_cents int null,
        activo bit not null default 1,
        creado_en datetime2 not null default sysutcdatetime(),

        constraint UQ_insumos_nombre
            unique (nombre),

        constraint CK_insumos_tipo
            check (tipo in ('insumo', 'reventa')),

        constraint CK_insumos_unidad
            check (unidad in ('g', 'kg', 'ml', 'l', 'unidad')),

        constraint CK_insumos_datos_reventa
            check (
                (
                    tipo = 'insumo'
                    and codigo is null
                    and precio_venta_cents is null
                )
                or
                (
                    tipo = 'reventa'
                    and codigo is not null
                    and len(ltrim(rtrim(codigo))) > 0
                    and precio_venta_cents is not null
                    and precio_venta_cents > 0
                )
            )
    );

    create unique index UX_insumos_codigo
        on dbo.insumos (codigo)
        where codigo is not null;

    create index IX_insumos_tipo_activo
        on dbo.insumos (tipo, activo);
end;
go
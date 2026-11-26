-- historial de entradas y salidas del inventario
if object_id('dbo.movimientos_inventario', 'U') is null
begin
    create table dbo.movimientos_inventario (
        id int identity(1,1) primary key,
        insumo_id int not null,
        sucursal_id int not null,
        usuario_id int null,
        tipo nvarchar(30) not null,
        cantidad decimal(18,3) not null,
        stock_anterior decimal(18,3) not null,
        stock_nuevo decimal(18,3) not null,
        referencia_tipo nvarchar(30) null,
        referencia_id int null,
        motivo nvarchar(250) null,
        fecha datetime2 not null default sysutcdatetime(),

        constraint FK_movimientos_existencia
            foreign key (insumo_id, sucursal_id)
            references dbo.existencias(insumo_id, sucursal_id),

        constraint FK_movimientos_usuario
            foreign key (usuario_id)
            references dbo.usuarios(id),

        constraint CK_movimientos_tipo
            check (
                tipo in (
                    'entrada',
                    'salida',
                    'ajuste_entrada',
                    'ajuste_salida',
                    'devolucion'
                )
            ),

        constraint CK_movimientos_cantidad
            check (cantidad > 0),

        constraint CK_movimientos_stock
            check (
                stock_anterior >= 0
                and stock_nuevo >= 0
            ),

        constraint CK_movimientos_operacion
            check (
                (
                    tipo in ('entrada', 'ajuste_entrada', 'devolucion')
                    and stock_nuevo = stock_anterior + cantidad
                )
                or
                (
                    tipo in ('salida', 'ajuste_salida')
                    and stock_nuevo = stock_anterior - cantidad
                )
            )
    );

    create index IX_movimientos_insumo_fecha
        on dbo.movimientos_inventario
        (insumo_id, sucursal_id, fecha desc);

    create index IX_movimientos_referencia
        on dbo.movimientos_inventario
        (referencia_tipo, referencia_id);
end;
go
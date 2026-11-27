
-- Historial de entradas y salidas del inventario

IF OBJECT_ID('dbo.movimientos_inventario', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_inventario (
        id INT IDENTITY(1,1) NOT NULL,
        insumo_id INT NOT NULL,
        sucursal_id INT NOT NULL,
        usuario_id INT NULL,
        tipo NVARCHAR(30) NOT NULL,
        cantidad DECIMAL(18,3) NOT NULL,
        stock_anterior DECIMAL(18,3) NOT NULL,
        stock_nuevo DECIMAL(18,3) NOT NULL,
        referencia_tipo NVARCHAR(30) NULL,
        referencia_id INT NULL,
        motivo NVARCHAR(250) NULL,
        fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_movimientos_inventario
            PRIMARY KEY (id),

        CONSTRAINT FK_movimientos_inventario_existencia
            FOREIGN KEY (insumo_id, sucursal_id)
            REFERENCES dbo.existencias(insumo_id, sucursal_id),

        CONSTRAINT FK_movimientos_inventario_usuario
            FOREIGN KEY (usuario_id)
            REFERENCES dbo.usuarios(id),

        CONSTRAINT CK_movimientos_inventario_tipo
            CHECK (
                tipo IN (
                    'entrada',
                    'salida',
                    'ajuste_entrada',
                    'ajuste_salida',
                    'devolucion'
                )
            ),

        CONSTRAINT CK_movimientos_inventario_cantidad
            CHECK (cantidad > 0),

        CONSTRAINT CK_movimientos_inventario_stock
            CHECK (
                stock_anterior >= 0
                AND stock_nuevo >= 0
            ),

        CONSTRAINT CK_movimientos_inventario_operacion
            CHECK (
                (
                    tipo IN ('entrada', 'ajuste_entrada', 'devolucion')
                    AND stock_nuevo = stock_anterior + cantidad
                )
                OR
                (
                    tipo IN ('salida', 'ajuste_salida')
                    AND stock_nuevo = stock_anterior - cantidad
                )
            )
    );

    CREATE INDEX IX_movimientos_inventario_insumo_fecha
        ON dbo.movimientos_inventario
        (insumo_id, sucursal_id, fecha DESC);

    CREATE INDEX IX_movimientos_inventario_referencia
        ON dbo.movimientos_inventario
        (referencia_tipo, referencia_id);
END;
GO

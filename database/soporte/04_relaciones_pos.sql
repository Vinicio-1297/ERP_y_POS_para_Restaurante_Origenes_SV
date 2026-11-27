-- relacionar el pedido con el usuario que registra la venta
if object_id('dbo.fk_pedidos_usuario', 'F') is null
begin
    alter table dbo.pedidos
    add constraint fk_pedidos_usuario
        foreign key (usuario_id)
        references dbo.usuarios(id);
end;
go

-- relacionar el pedido con el usuario que realiza la anulacion
if object_id('dbo.fk_pedidos_anulado_por', 'F') is null
begin
    alter table dbo.pedidos
    add constraint fk_pedidos_anulado_por
        foreign key (anulado_por)
        references dbo.usuarios(id);
end;
go

-- agregar el cliente asociado al pedido
if col_length('dbo.pedidos', 'cliente_id') is null
begin
    alter table dbo.pedidos
    add cliente_id int null;
end;
go

-- relacionar el pedido con el cliente
if object_id('dbo.fk_pedidos_cliente', 'F') is null
begin
    alter table dbo.pedidos
    add constraint fk_pedidos_cliente
        foreign key (cliente_id)
        references dbo.clientes(id);
end;
go
-- guardar los datos del cliente al momento de emitir el comprobante

if col_length('dbo.pedidos', 'cliente_nombre') is null
    alter table dbo.pedidos add cliente_nombre nvarchar(150) null;
go

if col_length('dbo.pedidos', 'cliente_nit') is null
    alter table dbo.pedidos add cliente_nit nvarchar(20) null;
go

if col_length('dbo.pedidos', 'cliente_nrc') is null
    alter table dbo.pedidos add cliente_nrc nvarchar(20) null;
go

if col_length('dbo.pedidos', 'cliente_giro') is null
    alter table dbo.pedidos add cliente_giro nvarchar(200) null;
go

if col_length('dbo.pedidos', 'cliente_direccion') is null
    alter table dbo.pedidos add cliente_direccion nvarchar(250) null;
go
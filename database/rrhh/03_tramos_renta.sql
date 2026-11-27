-- tramos de la retención de renta. Viven en una tabla, no en el código, para poder actualizarlos
-- cuando Hacienda publique una tabla nueva (se agrega otro conjunto con una vigencia más reciente).
if object_id('dbo.tramos_renta', 'U') is null
begin
    create table dbo.tramos_renta (
        id int identity(1,1) primary key,
        periodo varchar(10) not null,
        desde_cents int not null,
        hasta_cents int null,
        porcentaje decimal(5,2) not null,
        exceso_sobre_cents int not null,
        cuota_fija_cents int not null,
        vigente_desde date not null,

        constraint ck_tramos_periodo
            check (periodo in ('quincenal', 'mensual', 'semanal')),
        constraint ck_tramos_rango
            check (hasta_cents is null or hasta_cents >= desde_cents),
        constraint ck_tramos_porcentaje
            check (porcentaje between 0 and 100)
    );
end;
go

if not exists (select 1 from sys.indexes where name = 'ux_tramos_renta' and object_id = object_id('dbo.tramos_renta'))
    create unique index ux_tramos_renta on dbo.tramos_renta (periodo, vigente_desde, desde_cents);
go
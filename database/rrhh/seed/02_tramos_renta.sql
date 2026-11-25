-- Tramos QUINCENALES de la retención de renta (Decreto Ejecutivo No. 10, Ministerio de Hacienda).
-- Importante: Se obtuvo esta tabla dividiendo la mensual entre 2.
-- vigente desde mayo de 2025 (Decreto Ejecutivo No. 10)
declare @vigente date = '2025-05-01';

if not exists (select 1 from dbo.tramos_renta where periodo = 'quincenal' and vigente_desde = @vigente and desde_cents = 0)
    insert into dbo.tramos_renta (periodo, desde_cents, hasta_cents, porcentaje, exceso_sobre_cents, cuota_fija_cents, vigente_desde)
    values ('quincenal', 0, 27500, 0, 0, 0, @vigente);

if not exists (select 1 from dbo.tramos_renta where periodo = 'quincenal' and vigente_desde = @vigente and desde_cents = 27501)
    insert into dbo.tramos_renta (periodo, desde_cents, hasta_cents, porcentaje, exceso_sobre_cents, cuota_fija_cents, vigente_desde)
    values ('quincenal', 27501, 44762, 10, 27500, 883, @vigente);

if not exists (select 1 from dbo.tramos_renta where periodo = 'quincenal' and vigente_desde = @vigente and desde_cents = 44763)
    insert into dbo.tramos_renta (periodo, desde_cents, hasta_cents, porcentaje, exceso_sobre_cents, cuota_fija_cents, vigente_desde)
    values ('quincenal', 44763, 101905, 20, 44762, 3000, @vigente);

if not exists (select 1 from dbo.tramos_renta where periodo = 'quincenal' and vigente_desde = @vigente and desde_cents = 101906)
    insert into dbo.tramos_renta (periodo, desde_cents, hasta_cents, porcentaje, exceso_sobre_cents, cuota_fija_cents, vigente_desde)
    values ('quincenal', 101906, null, 30, 101905, 14428, @vigente);
go
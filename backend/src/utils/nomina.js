// Funciones puras de la planilla quincenal (sin base de datos)
// Todo el dinero va en centavos enteros.
const { NOMINA } = require('../config/nomina');

const PUNTOS_BASE_TOTAL = 10000;

// Un tramo es { desdeCents, hastaCents (null = sin límite), porcentaje, excesoSobreCents, cuotaFijaCents }.
function buscarTramo(baseCents, tramos) {
  return (
    tramos.find(
      (tramo) => baseCents >= tramo.desdeCents && (tramo.hastaCents === null || baseCents <= tramo.hastaCents),
    ) ?? null
  );
}

// Retención = (base - exceso del tramo) × porcentaje + cuota fija.
function calcularRenta(baseCents, tramos) {
  const tramo = buscarTramo(baseCents, tramos);
  if (!tramo) return 0;

  const variable = Math.round(((baseCents - tramo.excesoSobreCents) * tramo.porcentaje) / 100);
  return variable + tramo.cuotaFijaCents;
}

// Base sobre la que se cotiza en la quincena. Si no hay tope (null), se cotiza sobre todo el salario.
function baseDeCotizacion(salarioQuincenalCents, baseMaximaMensualCents) {
  if (baseMaximaMensualCents === null) return salarioQuincenalCents;
  return Math.min(salarioQuincenalCents, Math.round(baseMaximaMensualCents / 2));
}

function calcularQuincena(salarioMensualCents, tramos, parametros = NOMINA) {
  const salarioQuincenalCents = Math.round(salarioMensualCents / 2);

  // ISSS y AFP se calculan sobre el salario. Solo el ISSS tiene base máxima (la mitad por ser quincena).
  const baseIsss = baseDeCotizacion(salarioQuincenalCents, parametros.ISSS_BASE_MAXIMA_MENSUAL_CENTS);
  const baseAfp = baseDeCotizacion(salarioQuincenalCents, parametros.AFP_BASE_MAXIMA_MENSUAL_CENTS);
  const isssCents = Math.round((baseIsss * parametros.ISSS_PUNTOS_BASE) / PUNTOS_BASE_TOTAL);
  const afpCents = Math.round((baseAfp * parametros.AFP_PUNTOS_BASE) / PUNTOS_BASE_TOTAL);

  // La renta se calcula sobre lo que queda después de ISSS y AFP.
  const baseRentaCents = salarioQuincenalCents - isssCents - afpCents;
  const rentaCents = calcularRenta(baseRentaCents, tramos);

  return {
    salarioQuincenalCents,
    isssCents,
    afpCents,
    baseRentaCents,
    rentaCents,
    netoCents: salarioQuincenalCents - isssCents - afpCents - rentaCents,
  };
}

function dosDigitos(numero) {
  return String(numero).padStart(2, '0');
}

// Quincena 1 = días 1 al 15. Quincena 2 = día 16 al último del mes. Fechas como "AAAA-MM-DD".
function periodoDeQuincena(anio, mes, quincena) {
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const prefijo = `${anio}-${dosDigitos(mes)}`;

  return quincena === 1
    ? { inicio: `${prefijo}-01`, fin: `${prefijo}-15` }
    : { inicio: `${prefijo}-16`, fin: `${prefijo}-${dosDigitos(ultimoDia)}` };
}

module.exports = { buscarTramo, calcularRenta, calcularQuincena, periodoDeQuincena };
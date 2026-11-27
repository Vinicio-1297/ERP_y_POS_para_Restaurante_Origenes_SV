// El Salvador no usa horario de verano: siempre es UTC-6. La base guarda las fechas en UTC,
// así que "el día 22 de noviembre" para el usuario va de 22/11 06:00 UTC a 23/11 06:00 UTC.
const DESFASE_HORAS = 6;

// "2026-11-22" -> Date a las 00:00 hora de El Salvador, expresado en UTC (o null si no es una fecha real).
function inicioDelDiaLocal(texto) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!coincidencia) return null;

  const [, anio, mes, dia] = coincidencia.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, DESFASE_HORAS));

  // Date "corrige" fechas imposibles (31 de febrero pasa a marzo): se detecta comparando de vuelta.
  const valida =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return valida ? fecha : null;
}

// Devuelve { desde, hasta } en UTC; "hasta" es EXCLUSIVO (el inicio del día siguiente), así el
// día final queda completo. Cualquiera de los dos puede faltar. Lanza Error si algo no es válido.
function rangoDeFechas(desdeTexto, hastaTexto) {
  const rango = {};

  if (desdeTexto) {
    rango.desde = inicioDelDiaLocal(desdeTexto);
    if (!rango.desde) throw new Error('desde debe ser una fecha válida con formato AAAA-MM-DD');
  }

  if (hastaTexto) {
    const inicio = inicioDelDiaLocal(hastaTexto);
    if (!inicio) throw new Error('hasta debe ser una fecha válida con formato AAAA-MM-DD');
    rango.hasta = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  }

  if (rango.desde && rango.hasta && rango.desde >= rango.hasta) {
    throw new Error('desde no puede ser posterior a hasta');
  }

  return rango;
}

module.exports = { inicioDelDiaLocal, rangoDeFechas };

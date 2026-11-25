// Parámetros legales de la planilla. Dinero en centavos; porcentajes en puntos base (100 pb = 1 %).
// FUENTES: Ley Integral del Sistema de Pensiones (AFP), ISSS y Decreto Ejecutivo No. 10 (renta).
// Los tramos de renta viven en la tabla dbo.tramos_renta.
const NOMINA = {
  ISSS_PUNTOS_BASE: 300, // 3 %
  AFP_PUNTOS_BASE: 725, // 7.25 %
  // Base máxima de cotización MENSUAL. En la quincena se usa la mitad. null = sin tope.
  ISSS_BASE_MAXIMA_MENSUAL_CENTS: 100000, // $1,000.00 (máximo $30.00 al mes)
  AFP_BASE_MAXIMA_MENSUAL_CENTS: null, // la AFP no tiene tope desde enero de 2023
};

module.exports = { NOMINA };
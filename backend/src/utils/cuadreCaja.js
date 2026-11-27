// Todo el dinero va en centavos enteros.

// filas: [{ metodo, proveedor, cantidad, totalCents }] agrupadas por la base de datos.
function resumirVentas(filas) {
  const ventas = { efectivoCents: 0, tarjetaCents: 0, digitalCents: 0, bitcoinCents: 0, chivoCents: 0, cantidadPedidos: 0 };

  for (const fila of filas) {
    ventas.cantidadPedidos += fila.cantidad;

    if (fila.metodo === 'efectivo') ventas.efectivoCents += fila.totalCents;
    if (fila.metodo === 'tarjeta') ventas.tarjetaCents += fila.totalCents;

    if (fila.metodo === 'digital') {
      ventas.digitalCents += fila.totalCents;
      // Dentro de "digital" se separa cuánto fue Bitcoin y cuánto Chivo (el resto queda sin detallar).
      if (fila.proveedor === 'bitcoin') ventas.bitcoinCents += fila.totalCents;
      if (fila.proveedor === 'chivo') ventas.chivoCents += fila.totalCents;
    }
  }

  return ventas;
}

// Lo que el sistema espera encontrar al cerrar. Solo el efectivo lleva apertura y movimientos.
function calcularEsperado({ montoAperturaCents, ventas, ingresosCents, egresosCents }) {
  return {
    efectivoCents: montoAperturaCents + ventas.efectivoCents + ingresosCents - egresosCents,
    tarjetaCents: ventas.tarjetaCents,
    digitalCents: ventas.digitalCents,
  };
}

// declarado - esperado: positivo = sobrante, negativo = faltante, 0 = cuadra.
function calcularDiferencias(esperado, declarado) {
  return {
    efectivoCents: declarado.efectivoCents - esperado.efectivoCents,
    tarjetaCents: declarado.tarjetaCents - esperado.tarjetaCents,
    digitalCents: declarado.digitalCents - esperado.digitalCents,
  };
}

module.exports = { resumirVentas, calcularEsperado, calcularDiferencias };
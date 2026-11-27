// Funciones puras del POS (sin base de datos), fáciles de probar con node --test.
// Todo el dinero va en centavos enteros para evitar errores de coma flotante.

const IVA_PORCENTAJE = 13;

// Junta líneas repetidas del mismo producto: [{1,2},{1,3}] -> [{1,5}].
function agruparItems(items) {
  const cantidadesPorProducto = new Map();

  for (const { productoId, cantidad } of items) {
    cantidadesPorProducto.set(productoId, (cantidadesPorProducto.get(productoId) ?? 0) + cantidad);
  }

  return [...cantidadesPorProducto].map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

// IVA = 13% del subtotal, redondeado al centavo (la mitad sube). Solo aritmética entera:
// (subtotal * 13 + 50) / 100 con división entera equivale a redondear subtotal * 0.13.
function calcularIvaCents(subtotalCents) {
  return Math.floor((subtotalCents * IVA_PORCENTAJE + 50) / 100);
}

// lineas: [{ precioCents, cantidad }]
function calcularTotales(lineas) {
  const subtotalCents = lineas.reduce((suma, linea) => suma + linea.precioCents * linea.cantidad, 0);
  const ivaCents = calcularIvaCents(subtotalCents);

  return { subtotalCents, ivaCents, totalCents: subtotalCents + ivaCents };
}

// 1 -> "0001"
function formatearNumero(numero, largo = 4) {
  return String(numero).padStart(largo, '0');
}

// Escapa % _ [ \ para que el texto del usuario se use literal dentro de un LIKE ... ESCAPE '\'.
function escaparLike(texto) {
  return texto.replace(/[\\%_[]/g, (caracter) => `\\${caracter}`);
}

module.exports = { IVA_PORCENTAJE, agruparItems, calcularIvaCents, calcularTotales, formatearNumero, escaparLike };

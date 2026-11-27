// Funciones puras para las alertas de stock del POS (sin base de datos, fáciles de probar con node --test).

// Mismo criterio que la pantalla de Inventario: agotado si no hay nada, bajo si llega al mínimo.
function estadoInsumo(existencia, stockMinimo) {
  const cantidad = Number(existencia) || 0;
  const minimo = Number(stockMinimo) || 0;

  if (cantidad <= 0) return 'agotado';
  if (cantidad <= minimo) return 'bajo';
  return 'ok';
}

// filas: una por ingrediente de receta activa:
// { productoId, rendimiento, insumoId, insumoNombre, cantidad, existencia, stockMinimo }
// productosElaborados: ids de productos elaborados activos (para detectar los que no tienen receta).
// Devuelve un objeto por producto con cuántas unidades se pueden preparar con el stock actual.
function calcularDisponibilidad(filas, productosElaborados = []) {
  const porProducto = new Map();

  for (const fila of filas) {
    if (!porProducto.has(fila.productoId)) porProducto.set(fila.productoId, []);
    porProducto.get(fila.productoId).push(fila);
  }

  const resultado = [];

  for (const productoId of productosElaborados) {
    const ingredientes = porProducto.get(productoId);

    if (!ingredientes) {
      resultado.push({ productoId, estado: 'sin-receta', disponible: 0, insumoLimitante: null });
      continue;
    }

    let disponible = Infinity;
    let limitante = null;
    let hayAlerta = false;

    for (const ing of ingredientes) {
      const rendimiento = Number(ing.rendimiento);
      const porUnidad = Number(ing.cantidad) / rendimiento;
      const existencia = Number(ing.existencia) || 0;

      if (!Number.isFinite(porUnidad) || porUnidad <= 0) continue;

      // El epsilon evita que 0.3 / 0.1 = 2.9999999 se redondee hacia abajo.
      const posibles = Math.floor(existencia / porUnidad + 1e-9);

      if (posibles < disponible) {
        disponible = posibles;
        limitante = { id: ing.insumoId, nombre: ing.insumoNombre };
      }

      if (estadoInsumo(existencia, ing.stockMinimo) !== 'ok') hayAlerta = true;
    }

    if (!Number.isFinite(disponible)) disponible = 0;

    let estado = 'ok';
    if (disponible < 1) estado = 'agotado';
    else if (hayAlerta) estado = 'bajo';

    resultado.push({ productoId, estado, disponible, insumoLimitante: limitante });
  }

  return resultado;
}

module.exports = { estadoInsumo, calcularDisponibilidad };

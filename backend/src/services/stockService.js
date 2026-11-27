// Alertas de stock para el POS: insumos bajo el mínimo y unidades que se pueden preparar por producto.
const stockRepository = require('../repositories/stockRepository');
const sucursalRepository = require('../repositories/sucursalRepository');
const { SUCURSAL_DEFECTO } = require('./pedidoService');
const { httpError } = require('../utils/httpError');
const { calcularDisponibilidad, estadoInsumo } = require('../utils/disponibilidad');

// Usa la misma sucursal que la venta (resuelta por nombre), para que las alertas
// reflejen exactamente el inventario que descuenta pedidoService.
async function obtenerAlertasPos(sucursal = SUCURSAL_DEFECTO) {
  const sucursalActual = await sucursalRepository.buscarActivaPorNombre(sucursal);

  if (!sucursalActual) {
    throw httpError(409, `La sucursal "${sucursal}" no existe o esta desactivada`);
  }

  const sucursalId = sucursalActual.id;

  const [ingredientes, elaborados, articulos] = await Promise.all([
    stockRepository.listarIngredientes(sucursalId),
    stockRepository.listarProductosElaborados(),
    stockRepository.listarArticulosEnAlerta(sucursalId),
  ]);

  return {
    sucursalId,
    productos: calcularDisponibilidad(ingredientes, elaborados),
    insumos: articulos.map((articulo) => ({
      id: articulo.id,
      nombre: articulo.nombre,
      tipo: articulo.tipo,
      unidad: articulo.unidad,
      cantidad: Number(articulo.cantidad),
      stockMinimo: Number(articulo.stockMinimo),
      estado: estadoInsumo(articulo.cantidad, articulo.stockMinimo),
    })),
  };
}

module.exports = { obtenerAlertasPos };

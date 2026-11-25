
const {
  obtenerVentasPorDia,
  obtenerVentasPorProducto,
  obtenerVentasPorSucursal,
} = require('../services/reporteService');

// Devuelve las ventas agrupadas por día.
async function getVentasPorDia(req, res, next) {
  try {
    const filtros = res.locals.validated.query;
    const resultado = await obtenerVentasPorDia(filtros);

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// Devuelve las unidades vendidas y los ingresos por producto.
async function getVentasPorProducto(req, res, next) {
  try {
    const filtros = res.locals.validated.query;
    const resultado = await obtenerVentasPorProducto(filtros);

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// Devuelve las ventas agrupadas por sucursal.
async function getVentasPorSucursal(req, res, next) {
  try {
    const filtros = res.locals.validated.query;
    const resultado = await obtenerVentasPorSucursal(filtros);

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVentasPorDia,
  getVentasPorProducto,
  getVentasPorSucursal,
};

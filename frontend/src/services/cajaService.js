// Endpoints de caja (Back D). El cajero sale del token, no se envía.
import { request } from './http.js';

const post = (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) });

export const getTurnoActual = (signal) => request('/caja/turno-actual', { signal });
export const getResumen = (signal) => request('/caja/turno-actual/resumen', { signal });
export const getMovimientos = (signal) => request('/caja/movimientos', { signal });

export const abrirCaja = (montoAperturaCents) => post('/caja/abrir', { montoAperturaCents });
export const registrarMovimiento = ({ tipo, montoCents, concepto }) =>
  post('/caja/movimientos', { tipo, montoCents, concepto });
export const cerrarCaja = (datos) => post('/caja/cerrar', datos);

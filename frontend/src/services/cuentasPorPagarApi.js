import { request } from './http.js';

export const listarCuentasPorPagar = (signal) => request('/cuentas-por-pagar', { signal });
export const obtenerCuentaPorPagar = (id, signal) => request(`/cuentas-por-pagar/${encodeURIComponent(id)}`, { signal });
export const crearCuentaPorPagar = (payload) => request('/cuentas-por-pagar', { method: 'POST', body: JSON.stringify(payload) });
export const registrarAbonoCuenta = (id, payload) => request(`/cuentas-por-pagar/${encodeURIComponent(id)}/abonos`, { method: 'POST', body: JSON.stringify(payload) });

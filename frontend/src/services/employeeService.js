// Endpoints de empleados, cargos y sucursales (Back D / Soporte).
import { request } from './http.js';

const send = (path, method, data) =>
  request(path, { method, ...(data ? { body: JSON.stringify(data) } : {}) });

export const getCargos = (signal) => request('/cargos', { signal });
export const getSucursales = (signal) => request('/sucursales', { signal });

export const getEmpleados = (filtros = {}, signal) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') params.set(clave, valor);
  });
  const query = params.toString();
  return request(`/empleados${query ? `?${query}` : ''}`, { signal });
};

export const crearEmpleado = (datos) => send('/empleados', 'POST', datos);
export const actualizarEmpleado = (id, datos) => send(`/empleados/${id}`, 'PUT', datos);
export const desactivarEmpleado = (id) => send(`/empleados/${id}`, 'DELETE');
export const reactivarEmpleado = (id) => send(`/empleados/${id}/reactivar`, 'PATCH');
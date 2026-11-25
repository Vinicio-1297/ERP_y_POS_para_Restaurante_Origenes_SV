// Endpoints de planilla quincenal y boletas (Back D).
import { request } from './http.js';

const post = (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) });

export const getParametrosPlanilla = (signal) => request('/planillas/parametros', { signal });

export const getPlanillas = (filtros = {}, signal) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') params.set(clave, valor);
  });
  const query = params.toString();
  return request(`/planillas${query ? `?${query}` : ''}`, { signal });
};

export const getPlanillaDetalle = (id, signal) => request(`/planillas/${id}`, { signal });

export const getBoletaEmpleado = (planillaId, empleadoId, signal) =>
  request(`/planillas/${planillaId}/boletas/${empleadoId}`, { signal });

export const generarPlanilla = (datos) => post('/planillas', datos);
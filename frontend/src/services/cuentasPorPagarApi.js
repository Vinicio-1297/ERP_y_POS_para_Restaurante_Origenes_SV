import { request } from './http.js';

// listar las cuentas por pagar con filtros opcionales
export async function listarCuentasPorPagar(filtros = {}, signal) {
  // mantener compatibilidad con las llamadas anteriores
  if (filtros instanceof AbortSignal) {
    signal = filtros;
    filtros = {};
  }

  const params = new URLSearchParams();

  if (filtros.proveedorId) {
    params.set('proveedorId', String(filtros.proveedorId));
  }

  if (filtros.estado) {
    params.set('estado', filtros.estado.toLowerCase());
  }

  if (filtros.q?.trim()) {
    params.set('q', filtros.q.trim());
  }

  const query = params.toString();

  const url = query
    ? `/cuentas-por-pagar?${query}`
    : '/cuentas-por-pagar';

  return request(url, { signal });
}

// obtener los indicadores generales
export function obtenerResumenCuentasPorPagar(signal) {
  return request('/cuentas-por-pagar/resumen', { signal });
}

// consultar una cuenta y su historial
export function obtenerCuentaPorPagar(id, signal) {
  return request(
    `/cuentas-por-pagar/${encodeURIComponent(id)}`,
    { signal }
  );
}

// registrar manualmente una factura
export function crearCuentaPorPagar(datos) {
  return request('/cuentas-por-pagar', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// registrar un abono
export function registrarAbono(id, datos) {
  return request(
    `/cuentas-por-pagar/${encodeURIComponent(id)}/abonos`,
    {
      method: 'POST',
      body: JSON.stringify(datos),
    }
  );
}

// mantener compatibilidad con la version de develop
export const registrarAbonoCuenta = registrarAbono;
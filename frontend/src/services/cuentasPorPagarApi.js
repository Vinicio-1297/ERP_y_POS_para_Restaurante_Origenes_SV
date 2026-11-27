function getAuthHeaders() {
  const token =
    sessionStorage.getItem('origenes.token') ||
    localStorage.getItem('origenes.token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.message ||
      payload.mensaje ||
      `Error HTTP ${response.status}`
    );
  }

  return payload.datos ?? payload;
}

// listar las cuentas por pagar
export async function listarCuentasPorPagar(filtros = {}, signal) {
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
    ? `/api/cuentas-por-pagar?${query}`
    : '/api/cuentas-por-pagar';

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    signal,
  });

  return handleResponse(response);
}

// obtener los indicadores generales
export async function obtenerResumenCuentasPorPagar(signal) {
  const response = await fetch('/api/cuentas-por-pagar/resumen', {
    headers: getAuthHeaders(),
    signal,
  });

  return handleResponse(response);
}

// consultar una cuenta y su historial
export async function obtenerCuentaPorPagar(id, signal) {
  const response = await fetch(
    `/api/cuentas-por-pagar/${encodeURIComponent(id)}`,
    {
      headers: getAuthHeaders(),
      signal,
    }
  );

  return handleResponse(response);
}

// registrar manualmente una factura
export async function crearCuentaPorPagar(datos) {
  const response = await fetch('/api/cuentas-por-pagar', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(datos),
  });

  return handleResponse(response);
}

// registrar un abono
export async function registrarAbono(id, datos) {
  const response = await fetch(
    `/api/cuentas-por-pagar/${encodeURIComponent(id)}/abonos`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    }
  );

  return handleResponse(response);
}
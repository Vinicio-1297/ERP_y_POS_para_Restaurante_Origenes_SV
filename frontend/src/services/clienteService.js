import { request } from './http.js';

export const listarClientes = (signal) => request('/clientes', { signal });

export const crearCliente = (cliente, signal) =>
  request('/clientes', {
    method: 'POST',
    body: JSON.stringify(cliente),
    signal,
  });

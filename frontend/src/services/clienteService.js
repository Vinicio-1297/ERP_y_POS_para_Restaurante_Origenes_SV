import { request } from './http.js';

export const listarClientes = (signal) => request('/clientes', { signal });
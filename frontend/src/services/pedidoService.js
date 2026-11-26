import { request } from './http.js';

export const crearPedido = (pedido, signal) =>
  request('/pedidos', {
    method: 'POST',
    body: JSON.stringify(pedido),
    signal,
  });

export const obtenerProximoNumero = async (signal) => {
  const result = await request('/pedidos/proximo-numero', { signal });
  return result.numero;
};
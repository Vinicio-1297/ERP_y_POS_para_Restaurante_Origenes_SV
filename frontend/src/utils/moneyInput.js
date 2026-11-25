// Ayudas para campos de dinero: el usuario escribe dólares, la API recibe centavos.
import { formatCents } from './money.js';

export function isValidAmount(value) {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function toCents(value) {
  return Math.round(Number(value) * 100);
}

// 1250 -> "$12.50"; -250 -> "-$2.50"
export function formatUsd(cents) {
  return `${cents < 0 ? '-' : ''}$${formatCents(Math.abs(cents))}`;
}

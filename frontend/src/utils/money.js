export const iva_rate  = 0.13; // 13% de IVA

// Convierte centavos a texto con formato de moneda. Ej: 1234 -> "12.34"
export function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

export function calculateTotals(items) {
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const ivaCents = Math.round(subtotalCents * iva_rate);
  return {subtotalCents, ivaCents, totalCents: subtotalCents + ivaCents};
}
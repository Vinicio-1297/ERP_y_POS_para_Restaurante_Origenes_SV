// Fecha corta en español para encabezados, por ejemplo "15 de nov 2026".
export default function formatToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('day')} de ${get('month').replace('.', '')} ${get('year')}`;
}
 
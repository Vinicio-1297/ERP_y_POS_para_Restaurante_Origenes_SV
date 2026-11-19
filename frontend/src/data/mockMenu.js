// Datos temporales para maquetar el POS. Se reemplazan por GET /api/productos cuando exista el módulo.
//  ojito ahi, Los precios están en centavos para evitar errores de coma flotante.

export const categories = [
  { id: 'todos', label: 'Todos', icon: '▦' },
  { id: 'desayunos', label: 'Desayunos', icon: '🍳' },
  { id: 'comida-tipica', label: 'Comida típica', icon: '🍲' },
  { id: 'postres', label: 'Postres', icon: '🍰' },
  { id: 'combos', label: 'Combos', icon: '🍴' },
  { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
];

export const products = [
  { id: 1, name: 'Croissant de mantequilla', priceCents: 280, category: 'desayunos', emoji: '🥐', branch: 'Agregar orden' },
  { id: 2, name: 'Té helado', priceCents: 280, category: 'bebidas', emoji: '🧋', branch: 'Agregar orden' },
  { id: 3, name: 'Combo de pupusas', priceCents: 280, category: 'combos', emoji: '🫓', branch: 'Agregar orden' },
  { id: 4, name: 'Sopa de gallina', priceCents: 450, category: 'comida-tipica', emoji: '🍲', branch: 'Agregar orden' },
  { id: 5, name: 'Pastel de tres leches', priceCents: 320, category: 'postres', emoji: '🍰', branch: 'Agregar orden' },
  { id: 6, name: 'Desayuno típico', priceCents: 395, category: 'desayunos', emoji: '🍳', branch: 'Agregar orden' },
];

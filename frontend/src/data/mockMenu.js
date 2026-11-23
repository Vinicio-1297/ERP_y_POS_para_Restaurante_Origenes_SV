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
  { id: 1, name: 'Croissant de mantequilla', priceCents: 200, category: 'desayunos', emoji: '🥐', image: '/img/productos/croissant.jpg', branch: 'Agregar orden' },
  { id: 2, name: 'Té helado', priceCents: 150, category: 'bebidas', emoji: '🧋', image: '/img/productos/te-helado.jpg', branch: 'Agregar orden' },
  { id: 3, name: 'Combo de pupusas', priceCents: 280, category: 'combos', emoji: '🫓', image: '/img/productos/combo-pupusas.jpg', branch: 'Agregar orden' },
  { id: 4, name: 'Sopa de gallina', priceCents: 450, category: 'comida-tipica', emoji: '🍲', image: '/img/productos/sopa-de-gallina.jpg', branch: 'Agregar orden' },
  { id: 5, name: 'Pastel de tres leches', priceCents: 320, category: 'postres', emoji: '🍰', image: '/img/productos/tres-leches.jpg', branch: 'Agregar orden' },
  { id: 6, name: 'Desayuno típico', priceCents: 395, category: 'desayunos', emoji: '🍳', image: '/img/productos/desayuno-tipico.jpg', branch: 'Agregar orden' },
  { id: 7,  name: 'Latte Grande',              priceCents: 350, category: 'bebidas',       emoji: '☕', image: '/img/productos/latte-grande.jpg',        branch: 'Agregar orden' },
  { id: 8,  name: 'Pupusas revueltas (3)',     priceCents: 300, category: 'comida-tipica', emoji: '🫓', image: '/img/productos/pupusas-revueltas.jpg',   branch: 'Agregar orden' },
  { id: 9,  name: 'Yuca frita con chicharrón', priceCents: 425, category: 'comida-tipica', emoji: '🍟', image: '/img/productos/yuca-frita.jpg',          branch: 'Agregar orden' },
  { id: 10, name: 'Atol de elote',             priceCents: 200, category: 'bebidas',       emoji: '🌽', image: '/img/productos/atol-de-elote.jpg',       branch: 'Agregar orden' },
  { id: 11, name: 'Quesadilla salvadoreña',    priceCents: 250, category: 'postres',       emoji: '🧀', image: '/img/productos/quesadilla.jpg',          branch: 'Agregar orden' },
  { id: 12, name: 'Combo desayuno y café',     priceCents: 495, category: 'combos',        emoji: '🍳', image: '/img/productos/combo-desayuno-cafe.jpg', branch: 'Agregar orden' },
];

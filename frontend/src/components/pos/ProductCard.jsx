import { formatCents } from '../../utils/money.js';
import ProductPhoto from './ProductPhoto.jsx';

// Texto de la etiqueta según el estado que calcula el backend (/productos/disponibilidad).
function etiquetaStock(stock) {
  if (!stock) return null;
  if (stock.estado === 'agotado') return 'Agotado';
  if (stock.estado === 'sin-receta') return 'Sin receta';
  if (stock.estado === 'bajo') return `Quedan ${stock.disponible}`;
  return null;
}

export default function ProductCard({ product, onAdd, stock }) {
  const etiqueta = etiquetaStock(stock);
  const bloqueado = stock?.estado === 'agotado' || stock?.estado === 'sin-receta';

  return (
    <article className={`product-card${bloqueado ? ' is-soldout' : ''}`}>
      <div className="product-photo" aria-hidden="true">
        <ProductPhoto image={product.image} emoji={product.emoji} />
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p>{formatCents(product.priceCents)} $</p>
        {etiqueta && <small className={`stock-badge is-${stock.estado}`}>{etiqueta}</small>}
      </div>
      <div className="product-footer">
        <span>{product.branch}</span>
        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={bloqueado}
          aria-label={bloqueado ? `${product.name} no disponible` : `Agregar ${product.name} al pedido`}
        >
          🛒
        </button>
      </div>
    </article>
  );
}

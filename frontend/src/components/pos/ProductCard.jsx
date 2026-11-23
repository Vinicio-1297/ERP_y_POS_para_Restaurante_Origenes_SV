import { formatCents } from '../../utils/money.js';
import ProductPhoto from './ProductPhoto.jsx';

export default function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card">
      <div className="product-photo" aria-hidden="true">
        <ProductPhoto image={product.image} emoji={product.emoji} />
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p>{formatCents(product.priceCents)} $</p>
      </div>
      <div className="product-footer">
        <span>{product.branch}</span>
        <button type="button" onClick={() => onAdd(product)} aria-label={`Agregar ${product.name} al pedido`}>
          🛒
        </button>
      </div>
    </article>
  );
}

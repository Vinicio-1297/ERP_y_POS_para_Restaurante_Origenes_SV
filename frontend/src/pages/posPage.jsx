import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Alert } from 'reactstrap';
import CategoryBar from '../components/pos/CategoryBar.jsx';
import OrderPanel from '../components/pos/OrderPanel.jsx';
import ProductCard from '../components/pos/ProductCard.jsx';
import useOrder from '../hooks/useOrder.js';
import { categories, products } from '../data/mockMenu.js';
import { formatCents } from '../utils/money.js';

// Normaliza para que "te" encuentre "Té" al buscar.
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PosPage() {
  const { search } = useOutletContext();
  const order = useOrder();
  const [category, setCategory] = useState('todos');
  const [orderNumber, setOrderNumber] = useState(1);
  const [notice, setNotice] = useState(null);

  const visibleProducts = useMemo(() => {
    const term = normalize(search.trim());
    return products.filter(
      (product) =>
        (category === 'todos' || product.category === category) &&
        (!term || normalize(product.name).includes(term)),
    );
  }, [category, search]);

  function handleProcessSale() {
    // OJO: reemplazar por POST /api/pedidos cuando exista el módulo de ventas. no olvidarlo
    setNotice(`Venta #${String(orderNumber).padStart(4, '0')} registrada por $ ${formatCents(order.totals.totalCents)} (simulada)`);
    order.clearOrder();
    setOrderNumber((current) => current + 1);
  }

  return (
    <div className="pos-page">
      <section className="pos-menu">
        {notice && (
          <Alert color="success" toggle={() => setNotice(null)} fade={false}>
            {notice}
          </Alert>
        )}
        <h2 className="pos-title">Categorías</h2>
        <CategoryBar categories={categories} active={category} onSelect={setCategory} />

        <h2 className="pos-title pos-title-menu">Menú</h2>
        {visibleProducts.length === 0 ? (
          <p className="pos-empty">No hay productos que coincidan.</p>
        ) : (
          <div className="pos-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={order.addProduct} />
            ))}
          </div>
        )}
      </section>

      <OrderPanel orderNumber={String(orderNumber).padStart(4, '0')} order={order} onProcessSale={handleProcessSale} />
    </div>
  );
}

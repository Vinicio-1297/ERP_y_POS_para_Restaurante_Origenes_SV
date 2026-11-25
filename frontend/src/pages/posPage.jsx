import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Alert } from 'reactstrap';
import CategoryBar from '../components/pos/CategoryBar.jsx';
import OrderPanel from '../components/pos/OrderPanel.jsx';
import ProductCard from '../components/pos/ProductCard.jsx';
import useOrder from '../hooks/useOrder.js';
import { categories, products } from '../data/mockMenu.js';
import { formatCents } from '../utils/money.js';
import { crearPedido, obtenerProximoNumero } from '../services/pedidoService.js';
import { listarClientes } from '../services/clienteService.js';

// Normaliza para que "te" encuentre "Té" al buscar.
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PosPage() {
  const { search } = useOutletContext();
  const order = useOrder();
  const [category, setCategory] = useState('todos');
  const [orderNumber, setOrderNumber] = useState('0001');
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);

  const visibleProducts = useMemo(() => {
    const term = normalize(search.trim());
    return products.filter(
      (product) =>
        (category === 'todos' || product.category === category) &&
        (!term || normalize(product.name).includes(term)),
    );
  }, [category, search]);

  async function cargarProximoNumero() {
    try {
      setOrderNumber(await obtenerProximoNumero());
    } catch {
      // es solo una referencia visual; si falla, se deja el valor anterior
    }
  }

  useEffect(() => {
    cargarProximoNumero();
  }, []);


  useEffect(() => {
    if (order.receiptType !== 'credito-fiscal') return;
    const controller = new AbortController();
    listarClientes(controller.signal)
      .then((lista) => setClientes(lista.filter((c) => c.nit && c.nrc && c.giro && c.direccion)))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [order.receiptType]);

  async function handleProcessSale() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const pedido = await crearPedido({
        tipoServicio: order.serviceType,
        tipoComprobante: order.receiptType,
        metodoPago: order.paymentMethod,
        ...(order.receiptType === 'credito-fiscal' && { clienteId: order.clienteId }),
        items: order.items.map((item) => ({ productoId: item.id, cantidad: item.quantity })),
      });
      setNotice(`Venta #${pedido.numero} registrada por $ ${formatCents(pedido.totalCents)}`);
      order.clearOrder();
      cargarProximoNumero();
    } catch (err) {
      setNotice(null);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pos-page">
      <section className="pos-menu">
        {notice && (
          <Alert color="success" toggle={() => setNotice(null)} fade={false}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert color="danger" toggle={() => setError(null)} fade={false}>
            {error}
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

      <OrderPanel orderNumber={orderNumber} order={order} onProcessSale={handleProcessSale} clientes={clientes} />
    </div>
  );
}

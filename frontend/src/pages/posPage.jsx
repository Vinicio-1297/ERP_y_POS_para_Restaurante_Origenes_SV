import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Alert } from 'reactstrap';
import CategoryBar from '../components/pos/CategoryBar.jsx';
import OrderPanel from '../components/pos/OrderPanel.jsx';
import ProductCard from '../components/pos/ProductCard.jsx';
import useOrder from '../hooks/useOrder.js';
import { categories, products } from '../data/mockMenu.js';
import { formatCents } from '../utils/money.js';
import { crearPedido, obtenerProximoNumero } from '../services/pedidoService.js';
import { listarClientes } from '../services/clienteService.js';
import { getTurnoActual } from '../services/cajaService.js';
import { inventarioService, recetasService } from '../services/frontbRepos.js';

// Normaliza para que "te" encuentre "Té" al buscar.
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function verificarStockDisponible(product, itemsActuales) {
  const cantidadDeseada = (itemsActuales.find((i) => i.id === product.id)?.quantity || 0) + 1;

  const stockDirecto = product.stock ?? product.stockDisponible;
  if (typeof stockDirecto === 'number' && cantidadDeseada > stockDirecto) {
    return `Stock insuficiente para "${product.name}". Disponible: ${stockDirecto} u.`;
  }

  const recetas = recetasService.list();
  const receta = recetas.find((r) => String(r.productoId) === String(product.id));
  if (receta && Array.isArray(receta.ingredientes) && receta.ingredientes.length > 0) {
    const inventario = inventarioService.list();
    const rendimiento = Number(receta.rendimiento) || 1;
    for (const ing of receta.ingredientes) {
      const insumo = inventario.find((inv) => String(inv.id) === String(ing.insumoId));
      if (!insumo) continue;
      const requerido = (Number(ing.cantidad) / rendimiento) * cantidadDeseada;
      if (requerido > Number(insumo.stock)) {
        return `Insumo insuficiente (${insumo.nombre}) para preparar "${product.name}". Stock actual: ${insumo.stock} ${insumo.unidad}.`;
      }
    }
  }

  return null;
}

export default function PosPage() {
  const { search } = useOutletContext();
  const order = useOrder();
  const [category, setCategory] = useState('todos');
  const [orderNumber, setOrderNumber] = useState('0001');
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [estadoCaja, setEstadoCaja] = useState('verificando');

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
    const controller = new AbortController();
    async function comprobarCaja() {
      try {
        await getTurnoActual(controller.signal);
        setEstadoCaja('abierta');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setEstadoCaja('cerrada');
        if (err.status !== 404) setError(err.message);
      }
    }
    comprobarCaja();
    return () => controller.abort();
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

  function handleAddProduct(product) {
    setError(null);
    const errorStock = verificarStockDisponible(product, order.items);
    if (errorStock) {
      setError(errorStock);
      return;
    }
    order.addProduct(product);
  }


 async function handleProcessSale() {
    if (saving) return;
    if (estadoCaja !== 'abierta') {
      setError('No puedes procesar ventas porque la caja está cerrada. Abre un turno primero.');
      return;
    }

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
      const correlativo = pedido.correlativo || pedido.numeroComprobante;
      setNotice(
        `Venta #${pedido.numero}${correlativo ? ` (${correlativo})` : ''} registrada por $ ${formatCents(pedido.totalCents)}`,
      );
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
        {estadoCaja === 'cerrada' && (
          <Alert color="warning" fade={false}>
            <strong>Caja cerrada:</strong> No hay ningún turno abierto.{' '}
            <Link to="/caja" className="alert-link">
              Abrir turno en Caja
            </Link>{' '}
            para poder facturar.
          </Alert>
        )}

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
              <ProductCard key={product.id} product={product} onAdd={handleAddProduct} />
            ))}
          </div>
        )}
      </section>

      <OrderPanel
        orderNumber={orderNumber}
        order={order}
        onProcessSale={handleProcessSale}
        clientes={clientes}
        cajaAbierta={estadoCaja === 'abierta'}
        saving={saving}
        onAddProduct={handleAddProduct}
      />
    </div>
  );
}

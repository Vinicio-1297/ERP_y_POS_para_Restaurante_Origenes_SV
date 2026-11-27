import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Alert } from 'reactstrap';
import CategoryBar from '../components/pos/CategoryBar.jsx';
import OrderPanel from '../components/pos/OrderPanel.jsx';
import ProductCard from '../components/pos/ProductCard.jsx';
import useOrder from '../hooks/useOrder.js';
import { categories, products } from '../data/mockMenu.js';
import { formatCents } from '../utils/money.js';
import { MODULES, canAccessModule } from '../utils/permissions.js';
import { abrirPdfPedido, crearPedido, obtenerProximoNumero } from '../services/pedidoService.js';
import { crearCliente, listarClientes } from '../services/clienteService.js';
import { getTurnoActual } from '../services/cajaService.js';
import { obtenerDisponibilidad } from '../services/stockService.js';

// Normaliza para que "te" encuentre "Té" al buscar.
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MAX_ALERTAS_VISIBLES = 5;
const REFRESCO_STOCK_MS = 60_000;
const SIN_STOCK = { productos: [], insumos: [] };

const formatQty = (value) => Number(value).toLocaleString('es-SV', { maximumFractionDigits: 3 });

// Revisa con los datos del backend si se puede agregar una unidad más.
// Sin datos del producto no bloquea: el servidor vuelve a validar el stock al vender.
function verificarStock(product, itemsActuales, stockPorProducto) {
  const info = stockPorProducto.get(Number(product.id));
  if (!info) return null;

  if (info.estado === 'sin-receta') {
    return `"${product.name}" no tiene una receta activa, no se puede vender.`;
  }

  const cantidadDeseada = (itemsActuales.find((i) => i.id === product.id)?.quantity || 0) + 1;
  if (cantidadDeseada <= info.disponible) return null;

  if (info.disponible < 1) {
    const falta = info.insumoLimitante ? ` Falta ${info.insumoLimitante.nombre}.` : '';
    return `"${product.name}" está agotado.${falta}`;
  }
  return `Stock insuficiente para "${product.name}". Disponible: ${info.disponible} u.`;
}

export default function PosPage() {
  const { search } = useOutletContext();
  const order = useOrder();
  const [category, setCategory] = useState('todos');
  const [orderNumber, setOrderNumber] = useState('0001');
  const [ultimaVenta, setUltimaVenta] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [estadoCaja, setEstadoCaja] = useState('verificando');
  const [stock, setStock] = useState(SIN_STOCK);

  const visibleProducts = useMemo(() => {
    const term = normalize(search.trim());
    return products.filter(
      (product) =>
        (category === 'todos' || product.category === category) &&
        (!term || normalize(product.name).includes(term)),
    );
  }, [category, search]);

  const stockPorProducto = useMemo(
    () => new Map(stock.productos.map((p) => [p.productoId, p])),
    [stock],
  );

  async function cargarProximoNumero() {
    try {
      setOrderNumber(await obtenerProximoNumero());
    } catch {
      // es solo una referencia visual; si falla, se deja el valor anterior
    }
  }

  // Las alertas son informativas: si la consulta falla se deja lo último que había,
  // porque el servidor igual valida el stock al registrar la venta.
  const cargarStock = useCallback(async (signal) => {
    try {
      setStock(await obtenerDisponibilidad(signal));
    } catch {
      // sin acción
    }
  }, []);

  useEffect(() => {
    cargarProximoNumero();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargarStock(controller.signal);
    const timer = setInterval(() => cargarStock(controller.signal), REFRESCO_STOCK_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [cargarStock]);

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
    const errorStock = verificarStock(product, order.items, stockPorProducto);
    if (errorStock) {
      setError(errorStock);
      return;
    }
    order.addProduct(product);
  }

  // Alta rápida de un cliente con datos fiscales: queda en la lista y seleccionado.
  async function handleCrearCliente(datos) {
    const cliente = await crearCliente(datos);
    setClientes((lista) => [...lista, cliente]);
    order.setClienteId(cliente.id);
    return cliente;
  }

  async function handleAbrirPdf(formato) {
    if (!ultimaVenta) return;
    try {
      await abrirPdfPedido(ultimaVenta.id, formato);
    } catch (err) {
      setError(err.message);
    }
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
      const etiqueta = pedido.tipoComprobante === 'credito-fiscal' ? 'CCF' : 'Factura';
      setUltimaVenta({
        id: pedido.id,
        texto: `Venta #${pedido.numero} · ${etiqueta} ${pedido.numeroComprobante} registrada por $ ${formatCents(pedido.totalCents)}`,
      });
      order.clearOrder();
      cargarProximoNumero();
      cargarStock();
    } catch (err) {
      setUltimaVenta(null);
      setError(err.message);
      // Si el servidor rechazó por stock, las alertas en pantalla ya estaban desactualizadas.
      cargarStock();
    } finally {
      setSaving(false);
    }
  }

  const alertasVisibles = stock.insumos.slice(0, MAX_ALERTAS_VISIBLES);
  const alertasOcultas = stock.insumos.length - alertasVisibles.length;
  const hayAgotados = stock.insumos.some((insumo) => insumo.estado === 'agotado');

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

        {stock.insumos.length > 0 && (
          <Alert color={hayAgotados ? 'danger' : 'warning'} fade={false} className="stock-alert">
            <strong>Alertas de stock ({stock.insumos.length})</strong>
            <ul>
              {alertasVisibles.map((insumo) => (
                <li key={insumo.id}>
                  {insumo.nombre}:{' '}
                  {insumo.estado === 'agotado'
                    ? 'agotado'
                    : `${formatQty(insumo.cantidad)} ${insumo.unidad} (mínimo ${formatQty(insumo.stockMinimo)})`}
                </li>
              ))}
            </ul>
            {alertasOcultas > 0 && (
              <small>
                y {alertasOcultas} más.{' '}
                {canAccessModule(MODULES.INVENTARIO) && (
                  <Link to="/inventario" className="alert-link">
                    Ver inventario
                  </Link>
                )}
              </small>
            )}
          </Alert>
        )}

        {ultimaVenta && (
          <Alert color="success" toggle={() => setUltimaVenta(null)} fade={false}>
            <div>{ultimaVenta.texto}</div>
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
              <ProductCard
                key={product.id}
                product={product}
                onAdd={handleAddProduct}
                stock={stockPorProducto.get(Number(product.id))}
              />
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
        onCrearCliente={handleCrearCliente}
      />
    </div>
  );
}

import { formatCents } from '../../utils/money.js';
import ProductPhoto from './ProductPhoto.jsx';

const SERVICE_TYPES = [
  { id: 'llevar', label: 'Llevar', icon: '🛍️' },
  { id: 'aqui', label: 'Comer aquí', icon: '🍴' },
];

const RECEIPT_TYPES = [
  { id: 'consumidor-final', label: 'Consumidor final' },
  { id: 'credito-fiscal', label: 'Crédito fiscal' },
];

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'digital', label: 'Digital' },
];

function OptionGroup({ options, value, onChange, label }) {
  return (
    <div className="order-options" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={`order-option${value === option.id ? ' is-active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function OrderPanel({ orderNumber, order, onProcessSale, clientes = [] }) {
  const { items, totals, serviceType, receiptType, paymentMethod } = order;

  return (
    <aside className="order-panel" aria-label="Pedido actual">
      <header className="order-header">
        <h2>Pedido #{orderNumber}</h2>
        <div className="order-service" role="radiogroup" aria-label="Tipo de servicio">
          {SERVICE_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={serviceType === type.id}
              className={serviceType === type.id ? 'is-active' : ''}
              onClick={() => order.setServiceType(type.id)}
            >
              <span aria-hidden="true">{type.icon}</span> {type.label}
            </button>
          ))}
        </div>
      </header>

      <ul className="order-items">
        {items.length === 0 && <li className="order-empty">Agrega productos del menú</li>}
        {items.map((item) => (
          <li key={item.id} className="order-item">
            <div className="order-item-photo" aria-hidden="true">
              <ProductPhoto image={item.image} emoji={item.emoji} />
            </div>
            <div className="order-item-name">
              <strong>{item.name}</strong>
              <small>{formatCents(item.priceCents)}$/u</small>
            </div>
            <div className="qty-stepper">
              <button type="button" onClick={() => order.changeQuantity(item.id, -1)} aria-label={`Quitar una unidad de ${item.name}`}>−</button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => order.changeQuantity(item.id, 1)} aria-label={`Agregar una unidad de ${item.name}`}>+</button>
            </div>
            <span className="order-item-total">{formatCents(item.priceCents * item.quantity)}$</span>
            <button type="button" className="order-item-remove" onClick={() => order.removeProduct(item.id)} aria-label={`Eliminar ${item.name}`}>
              🗑️
            </button>
          </li>
        ))}
      </ul>

      <section className="order-totals">
        <dl>
          <div><dt>Subtotal</dt><dd>{formatCents(totals.subtotalCents)} $</dd></div>
          <div><dt>Iva (13%)</dt><dd>{formatCents(totals.ivaCents)} $</dd></div>
        </dl>
        <div className="order-total">
          <span>Total</span>
          <strong>$ {formatCents(totals.totalCents)}</strong>
        </div>
      </section>

      <section className="order-checkout">
        <p>Tipo de comprobante</p>
        <OptionGroup options={RECEIPT_TYPES} value={receiptType} onChange={order.setReceiptType} label="Tipo de comprobante" />
        {receiptType === 'credito-fiscal' && (
          <>
            <p>Cliente</p>
            <select
              className="form-select"
              aria-label="Cliente"
              value={order.clienteId ?? ''}
              onChange={(event) => order.setClienteId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} — NIT {cliente.nit}
                </option>
              ))}
            </select>
            {clientes.length === 0 && <small>No hay clientes con datos fiscales completos.</small>}
          </>
        )}
        <p>Método de pago</p>
        <OptionGroup options={PAYMENT_METHODS} value={paymentMethod} onChange={order.setPaymentMethod} label="Método de pago" />
        <button type="button" className="process-sale" disabled={items.length === 0 || (receiptType === 'credito-fiscal' && !order.clienteId)} onClick={onProcessSale}>
          💳 Procesar venta
        </button>
      </section>
    </aside>
  );
}


  
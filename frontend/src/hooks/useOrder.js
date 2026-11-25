import { useMemo, useState } from 'react';
import { calculateTotals } from '../utils/money.js';

// Estado del pedido en curso. Cuando exista la API, processSale hará el POST /api/pedidos.
export default function useOrder() {
  const [items, setItems] = useState([]);
  const [serviceType, setServiceType] = useState('aqui'); // 'llevar' | 'aqui'
  const [receiptType, setReceiptType] = useState('consumidor-final'); // 'consumidor-final' | 'credito-fiscal'
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'digital'
  const [clienteId, setClienteId] = useState(null); 

  const totals = useMemo(() => calculateTotals(items), [items]);

  function addProduct(product) {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { id: product.id, name: product.name, priceCents: product.priceCents, emoji: product.emoji, image: product.image, quantity: 1 }];
    });
  }

  function changeQuantity(id, delta) {
    setItems((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function removeProduct(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function clearOrder() {
    function clearOrder() {
    setItems([]);
    setClienteId(null);
}
  }

  return {
    items,
    totals,
    serviceType,
    setServiceType,
    receiptType,
    setReceiptType,
    paymentMethod,
    setPaymentMethod,
    addProduct,
    changeQuantity,
    removeProduct,
    clearOrder,
    clienteId,
    setClienteId,
    
  };
}

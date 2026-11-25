import { useState } from 'react';
import { Button, FormGroup, Input, Label } from 'reactstrap';
import { isValidAmount, toCents } from '../../utils/moneyInput.js';

const FORM_VACIO = { tipo: 'egreso', monto: '', concepto: '' };

export default function MovimientoForm({ onRegistrar, enviando }) {
  const [form, setForm] = useState(FORM_VACIO);
  const cambiar = (campo) => (event) => setForm({ ...form, [campo]: event.target.value });
  const valido = isValidAmount(form.monto) && Number(form.monto) > 0 && form.concepto.trim().length >= 3;

  async function enviar(event) {
    event.preventDefault();
    const registrado = await onRegistrar({ tipo: form.tipo, montoCents: toCents(form.monto), concepto: form.concepto.trim() });
    if (registrado) setForm(FORM_VACIO);
  }

  return (
    <section className="caja-card">
      <h3>Registrar movimiento</h3>
      <p className="caja-note">Entradas o salidas de efectivo que no son ventas (por ejemplo, pago a un proveedor).</p>
      <form onSubmit={enviar}>
        <FormGroup>
          <Label for="mov-tipo">Tipo</Label>
          <Input id="mov-tipo" type="select" value={form.tipo} onChange={cambiar('tipo')}>
            <option value="egreso">Egreso (sale efectivo)</option>
            <option value="ingreso">Ingreso (entra efectivo)</option>
          </Input>
        </FormGroup>
        <FormGroup>
          <Label for="mov-monto">Monto (USD)</Label>
          <Input id="mov-monto" type="number" min="0" step="0.01" value={form.monto} onChange={cambiar('monto')} />
        </FormGroup>
        <FormGroup>
          <Label for="mov-concepto">Concepto</Label>
          <Input id="mov-concepto" maxLength={200} value={form.concepto} onChange={cambiar('concepto')} />
        </FormGroup>
        <Button type="submit" color="secondary" disabled={!valido || enviando}>Registrar</Button>
      </form>
    </section>
  );
}

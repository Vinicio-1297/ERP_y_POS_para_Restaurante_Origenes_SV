import { useState } from 'react';
import { Button, FormFeedback, FormGroup, Input, Label } from 'reactstrap';
import { isValidAmount, toCents } from '../../utils/moneyInput.js';

const FORM_VACIO = { tipo: 'egreso', monto: '', concepto: '' };
const MIN_CONCEPTO = 3;

export default function MovimientoForm({ onRegistrar, enviando }) {
  const [form, setForm] = useState(FORM_VACIO);
  const cambiar = (campo) => (event) => setForm({ ...form, [campo]: event.target.value });

  const montoValido = isValidAmount(form.monto) && Number(form.monto) > 0;
  const conceptoValido = form.concepto.trim().length >= MIN_CONCEPTO;
  const valido = montoValido && conceptoValido;

  async function enviar(event) {
    event.preventDefault();
    if (!valido || enviando) return;
    const registrado = await onRegistrar({
      tipo: form.tipo,
      montoCents: toCents(form.monto),
      concepto: form.concepto.trim(),
    });
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
          <Input
            id="mov-monto"
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={cambiar('monto')}
            invalid={form.monto !== '' && !montoValido}
          />
          <FormFeedback>El monto debe ser mayor que $0.00.</FormFeedback>
        </FormGroup>
        <FormGroup>
          <Label for="mov-concepto">Concepto (mínimo {MIN_CONCEPTO} caracteres)</Label>
          <Input
            id="mov-concepto"
            maxLength={200}
            placeholder="Ej.: Pago a proveedor"
            value={form.concepto}
            onChange={cambiar('concepto')}
            invalid={form.concepto !== '' && !conceptoValido}
          />
          <FormFeedback>Escribe al menos {MIN_CONCEPTO} caracteres para describir el movimiento.</FormFeedback>
        </FormGroup>
        <Button type="submit" color="secondary" disabled={!valido || enviando}>Registrar</Button>
      </form>
    </section>
  );
}
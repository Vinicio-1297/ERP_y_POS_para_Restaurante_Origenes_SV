import { useState } from 'react';
import { Button, FormGroup, Input, Label } from 'reactstrap';
import { isValidAmount, toCents } from '../../utils/moneyInput.js';

export default function CierreCajaForm({ onCerrar, enviando }) {
  const [form, setForm] = useState({ efectivo: '', tarjeta: '', digital: '', observaciones: '' });
  const cambiar = (campo) => (event) => setForm({ ...form, [campo]: event.target.value });
  const valido = [form.efectivo, form.tarjeta, form.digital].every(isValidAmount);

  function cerrar() {
    if (!window.confirm('¿Cerrar la caja? Esta acción no se puede deshacer.')) return;
    onCerrar({
      efectivoContadoCents: toCents(form.efectivo),
      tarjetaDeclaradaCents: toCents(form.tarjeta),
      digitalDeclaradoCents: toCents(form.digital),
      ...(form.observaciones.trim() ? { observaciones: form.observaciones.trim() } : {}),
    });
  }

  return (
    <section className="caja-card">
      <h3>Cerrar caja</h3>
      <p className="caja-note">Ingresa lo que contaste en el turno. El sistema lo compara con lo esperado.</p>
      {[
        ['efectivo', 'Efectivo contado (USD)'],
        ['tarjeta', 'Total en tarjetas (USD)'],
        ['digital', 'Total digital (USD)'],
      ].map(([campo, etiqueta]) => (
        <FormGroup key={campo}>
          <Label for={`cierre-${campo}`}>{etiqueta}</Label>
          <Input id={`cierre-${campo}`} type="number" min="0" step="0.01" value={form[campo]} onChange={cambiar(campo)} />
        </FormGroup>
      ))}
      <FormGroup>
        <Label for="cierre-obs">Observaciones (opcional)</Label>
        <Input id="cierre-obs" type="textarea" rows="2" maxLength={300} value={form.observaciones} onChange={cambiar('observaciones')} />
      </FormGroup>
      <Button color="danger" disabled={!valido || enviando} onClick={cerrar}>Cerrar caja</Button>
    </section>
  );
}

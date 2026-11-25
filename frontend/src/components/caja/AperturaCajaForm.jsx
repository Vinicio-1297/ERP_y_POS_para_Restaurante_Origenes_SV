import { useState } from 'react';
import { Button, FormGroup, Input, Label } from 'reactstrap';
import { isValidAmount, toCents } from '../../utils/moneyInput.js';

export default function AperturaCajaForm({ onAbrir, enviando }) {
  const [monto, setMonto] = useState('');

  return (
    <section className="caja-card">
      <h2>Abrir caja</h2>
      <p>Cuenta el efectivo con el que empieza tu turno. Sin caja abierta no se pueden registrar ventas.</p>
      <FormGroup>
        <Label for="monto-apertura">Fondo inicial (USD)</Label>
        <Input
          id="monto-apertura"
          type="number"
          min="0"
          step="0.01"
          value={monto}
          onChange={(event) => setMonto(event.target.value)}
        />
      </FormGroup>
      <Button color="primary" disabled={!isValidAmount(monto) || enviando} onClick={() => onAbrir(toCents(monto))}>
        Abrir caja
      </Button>
    </section>
  );
}

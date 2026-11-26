import { useState } from 'react';

const VACIO = { nombre: '', nit: '', nrc: '', giro: '', direccion: '' };

// [campo, etiqueta, largo máximo] (los largos coinciden con clienteSchemas del backend).
const CAMPOS = [
  ['nombre', 'Nombre o razón social', 150],
  ['nit', 'NIT', 20],
  ['nrc', 'NRC', 20],
  ['giro', 'Giro', 200],
  ['direccion', 'Dirección', 250],
];

// Alta rápida de un cliente con todos los datos que exige el crédito fiscal.
export default function ClienteFiscalForm({ onCrear, onCancelar }) {
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (guardando) return;

    const limpio = Object.fromEntries(Object.entries(datos).map(([campo, valor]) => [campo, valor.trim()]));
    const faltante = CAMPOS.find(([campo]) => !limpio[campo]);
    if (faltante) {
      setError(`Falta ${faltante[1]}.`);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await onCrear(limpio);
      onCancelar();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <form className="cliente-form" onSubmit={handleSubmit} noValidate>
      {CAMPOS.map(([campo, etiqueta, maximo]) => (
        <input
          key={campo}
          className="form-control form-control-sm"
          placeholder={etiqueta}
          aria-label={etiqueta}
          maxLength={maximo}
          value={datos[campo]}
          onChange={(event) => setDatos((actual) => ({ ...actual, [campo]: event.target.value }))}
        />
      ))}
      {error && <small className="cliente-form-error" role="alert">{error}</small>}
      <div className="cliente-form-actions">
        <button type="submit" className="order-option is-active" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cliente'}
        </button>
        <button type="button" className="order-option" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

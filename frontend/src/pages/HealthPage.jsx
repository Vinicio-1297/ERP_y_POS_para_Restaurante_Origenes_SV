import { useEffect, useState } from 'react';
import { Alert, Badge, Container } from 'reactstrap';
import { getHealth } from '../services/healthService.js';

export default function HealthPage() {
  const [health, setHealth] = useState({ status: 'loading', message: 'Comprobando conexión…' });

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((result) => setHealth({ status: 'ok', message: result.message }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setHealth({ status: 'error', message: error.message });
        }
      });

    return () => controller.abort();
  }, []);

  const connected = health.status === 'ok';

  return (
    <main className="health-shell">
      <Container className="health-content">
        <p className="health-kicker">ORÍGENES SV · POS / ERP</p>
        <h1>Centro de operaciones</h1>
        <p className="health-copy">Estado inicial de la conexión con los servicios.</p>
        <Alert fade={false} color={connected ? 'success' : health.status === 'error' ? 'danger' : 'light'} className="health-alert">
          <span className="me-2">API</span>
          <Badge color={connected ? 'success' : health.status === 'error' ? 'danger' : 'secondary'}>
            {health.status === 'loading' ? 'Conectando' : connected ? 'Disponible' : 'Sin conexión'}
          </Badge>
          <span className="ms-3">{health.message}</span>
        </Alert>
      </Container>
    </main>
  );
}
const apiUrl = import.meta.env.VITE_API_URL || '/api';

// Fetch nativo mantiene las llamadas de la aplicación sin dependencias HTTP adicionales.
export async function getHealth(signal) {
  const response = await fetch(`${apiUrl}/health`, { signal });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `La API respondió con HTTP ${response.status}`);
  }

  if (!result) {
    throw new Error('La API devolvió una respuesta inválida');
  }

  return { message: result.message || 'API y base de datos conectadas' };
}
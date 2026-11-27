import { useState } from 'react';

// Muestra la foto del producto; si no hay foto o falla la carga, cae al emoji.
export default function ProductPhoto({ image, emoji }) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) return <span>{emoji}</span>;
  return <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
// O service worker só é registrado no app "de verdade" (build), não no npm run dev.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Falha ao registrar o service worker', err));
  });
}

export {};

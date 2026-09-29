import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/reset.css';
import './styles/variables.css';

async function enableMocking() {
  // Dead code in production builds: MODE is replaced at build time.
  if (import.meta.env.MODE !== 'mock') return;
  const { setupWorker } = await import('msw/browser');
  const { handlers } = await import('./test/handlers');
  const { resetDb } = await import('./test/db');
  // ponytail: mock session is lost on reload, persist it in sessionStorage if demos need it
  resetDb();
  await setupWorker(...handlers).start({ onUnhandledRequest: 'bypass' });
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

await enableMocking();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

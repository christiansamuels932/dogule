import React from 'react';
import ReactDOM from 'react-dom/client';
import { setBaseUrl } from '@dogule/sdk';

import App from './App';

setBaseUrl(import.meta.env.VITE_API_BASE ?? '/api');

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css'; // sau 'antd/dist/antd.css' pentru versiuni mai vechi
import './index.scss'; // Importați fișierul SCSS global
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

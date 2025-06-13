import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css'; // sau 'antd/dist/antd.css' pentru versiuni mai vechi
import './index.scss'; // Importați fișierul SCSS global
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

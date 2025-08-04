import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import './index.scss';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

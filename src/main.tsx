import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import './index.scss';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';

// Suppress non-critical console warnings in development
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Suppress known non-critical warnings
    if (
      message.includes('[antd: compatible] antd v5 support React is 16 ~ 18') ||
      message.includes('-ms-high-contrast is in the process of being deprecated')
    ) {
      return; // Suppress these warnings
    }
    
    // Show all other warnings
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

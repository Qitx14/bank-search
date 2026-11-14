import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

// GitHub Pages 部署在 /bank-search/ 子路径，路由 basename 需与 vite base 一致
const basename = import.meta.env.BASE_URL !== '/'
  ? import.meta.env.BASE_URL.replace(/\/+$/, '')
  : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

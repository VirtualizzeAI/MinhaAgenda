import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './styles/global.css';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import App from './App';

dayjs.locale('pt-br');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

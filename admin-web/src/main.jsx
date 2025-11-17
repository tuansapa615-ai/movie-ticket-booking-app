// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// THAY ĐỔI DÒNG NÀY cho Bootstrap Icons
import 'bootstrap-icons/font/bootstrap-icons.min.css'; // Đã thay đổi thành .min.css

// Import CSS tùy chỉnh của bạn (nếu có)
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

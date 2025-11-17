// src/components/Header.jsx
import React from 'react';
import { getUser } from '../utils/auth.js';
import aptechLogo from '../assets/logos/aptechcinemas-logo.png'; // <-- IMPORT LOGO VÀO ĐÂY

const Header = ({ handleLogout }) => {
  const user = getUser();

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm rounded-top p-3">
      <div className="container-fluid">
        <div className="navbar-brand mb-0 h1 d-flex align-items-center"> {/* Thêm d-flex align-items-center để căn chỉnh logo và text */}
          {/* SỬ DỤNG BIẾN ĐÃ IMPORT CHO SRC */}
          <img 
            src={aptechLogo} 
            alt="Aptech Cinemas Logo" 
            className="me-2" // Thêm margin-right nếu muốn khoảng cách giữa logo và text
            style={{ height: '100px' }} // Tùy chỉnh kích thước logo
          />
          Bảng điều khiển Admin
        </div>

        <div className="d-flex align-items-center ms-auto">
          {user ? (
            <span className="me-3 text-dark">Xin chào, <span className="fw-bold">{user.username}</span>!</span>
          ) : (
            <span className="me-3 text-dark">Admin</span>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-danger"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
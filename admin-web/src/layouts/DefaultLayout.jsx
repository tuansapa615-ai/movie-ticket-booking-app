// src/layouts/DefaultLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar, AppHeader, AppFooter } from '../components';
import { getUser } from '../utils/auth.js';

const DefaultLayout = ({ handleLogout }) => {
  const user = getUser();

  return (
    // Sử dụng các lớp Bootstrap cho bố cục chính
    <div className="d-flex vh-100 bg-light font-inter"> {/* d-flex, vh-100 (viewport height), bg-light (màu nền nhạt), font-inter (font đã import) */}
      {/* AppSidebar: Nằm bên trái ngoài cùng */}
      {/* react-pro-sidebar sẽ tự quản lý chiều rộng, chúng ta chỉ cần đảm bảo nó nằm đúng vị trí */}
      <AppSidebar user={user} handleLogout={handleLogout} />

      {/* Wrapper cho Header, Content và Footer (chiếm phần còn lại của màn hình) */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        {/* AppHeader: Nằm trên cùng của khu vực nội dung chính */}
        <AppHeader handleLogout={handleLogout} />

        {/* Khu vực chứa nội dung của các trang (Outlet) */}
        <main className="flex-grow-1 p-3 overflow-auto"> {/* p-3 (padding), overflow-auto (cho phép cuộn) */}
          <Outlet /> {/* Đây là nơi các route con sẽ được render */}
        </main>

        {/* AppFooter: Nằm dưới cùng của khu vực nội dung chính */}
        <AppFooter />
      </div>
    </div>
  );
};

export default DefaultLayout;

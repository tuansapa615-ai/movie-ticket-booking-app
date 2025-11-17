// src/components/Sidebar.jsx
import React, { useState, useRef } from 'react';
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import { Link, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdImage,
  MdMovie,
  MdPeople,
  MdExitToApp,
  MdCalendarMonth,
  MdLocalMovies,
  MdTheaters,
  MdAttachMoney,
  MdEventSeat,
  MdChevronLeft,
  MdChevronRight,
} from 'react-icons/md';
import { FaTicketAlt } from 'react-icons/fa';
import { PiPopcornFill } from 'react-icons/pi';

import { getUser, saveAuthData } from '../utils/auth.js';
import { uploadAvatar } from '../api/api.js';


const CustomSidebar = ({ handleLogout }) => {
  const user = getUser();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const [collapsed, setCollapsed] = useState(false); // Mặc định là không thu gọn

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (user) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Chỉ cho phép tải lên tệp ảnh (JPG, PNG, GIF).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB
      setUploadError('Kích thước tệp không được vượt quá 2MB.');
      return;
    }
    setUploadError(null);
    setIsUploadingAvatar(true);

    try {
      const response = await uploadAvatar(file); 
      
      if (response.user) {
        saveAuthData(localStorage.getItem('admin_token'), response.user);
        window.location.reload(); 
      } else {
        setUploadError(response.message || 'Tải avatar thất bại.');
      }
    } catch (err) {
      setUploadError(err.message || 'Đã xảy ra lỗi khi tải avatar.');
      console.error("Lỗi tải avatar:", err);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  return (
    <Sidebar
      backgroundColor="#2b323c"
      className="pro-sidebar"
      collapsed={collapsed} 
      width='280px'
    >
  
      <div 
        style={{ 
          textAlign: 'right', 
          padding: '10px', 
          cursor: 'pointer', 
          color: 'white',
          position: 'sticky', 
          top: '0', 
          zIndex: 100 
        }}
        onClick={() => setCollapsed(!collapsed)} // Toggle trạng thái collapsed
      >
        {collapsed ? <MdChevronRight size={24} />  : <MdChevronLeft size={24} />}
      </div>

  
      {!collapsed && ( 
        user ? (
          <div className="sidebar-user-info">
            {/* Avatar có thể click được */}
            <div className="user-avatar-container" onClick={handleAvatarClick}>
              {isUploadingAvatar ? (
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="user-avatar" />
              ) : (
                <MdPeople className="user-avatar-placeholder-icon" />
              )}
       
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
                accept="image/*" 
              />
            </div>
            <p className="user-name">Admin : {user.username}</p>
            <p className="user-email">{user.email}</p>
            {uploadError && <p className="text-danger small">{uploadError}</p>}
          </div>
        ) : ( 
          <div className="sidebar-user-info">
            <MdPeople className="user-avatar-placeholder-icon" />
            <p className="user-name">Guest</p>
            <p className="user-email">Please log in</p>
          </div>
        )
      )}
      <Menu
        menuItemStyles={{
          button: ({ active }) => ({
            color: active ? '#1890ff' : '#cbd5e1',
            backgroundColor: active ? '#334155' : 'transparent',
            '&:hover': {
              backgroundColor: '#334155',
              color: '#1890ff',
            },
          }),
        }}
      >
        <MenuItem
          icon={<MdDashboard />}
          component={<Link to="/dashboard" />}
          className={isActive('/dashboard') ? 'active' : ''}
        >
          Bảng điều khiển
        </MenuItem>

        <MenuItem
          icon={<MdMovie />}
          component={<Link to="/movies/all" />}
          className={isActive('/movies/all') ? 'active' : ''}
        >
          Quản lý phim
        </MenuItem>
        <MenuItem
          icon={<MdImage />}
          component={<Link to="/banners" />}
          className={isActive('/banners') ? 'active' : ''}
        >
          Quản lý Banners
        </MenuItem>
        <MenuItem
          icon={<MdLocalMovies />}
          component={<Link to="/cinemas" />}
          className={isActive('/cinemas') ? 'active' : ''}
        >
          Quản lý Rạp Chiếu
        </MenuItem>
        <MenuItem
          icon={<MdTheaters />}
          component={<Link to="/halls" />}
          className={isActive('/halls') ? 'active' : ''}
        >
          Quản lý phòng chiếu
        </MenuItem>
        <MenuItem
          icon={<MdEventSeat />}
          component={<Link to="/seats" />}
          className={isActive('/seats') ? 'active' : ''}
        >
          Quản lý ghế ngồi
        </MenuItem>
        <MenuItem
          icon={<MdAttachMoney />}
          component={<Link to="/seat-pricing" />}
          className={isActive('/seat-pricing') ? 'active' : ''}
        >
          Quản lý giá ghế
        </MenuItem>
        <MenuItem
          icon={<MdCalendarMonth />}
          component={<Link to="/showtimes" />}
          className={isActive('/showtimes') ? 'active' : ''}
        >
          Quản lý suất chiếu
        </MenuItem>
        <MenuItem
          icon={<PiPopcornFill />}
          component={<Link to="/food-items" />}
          className={isActive('/food-items') ? 'active' : ''}
        >
          Quản lý đồ ăn
        </MenuItem>
        
        <MenuItem
          icon={<MdPeople />}
          component={<Link to="/users" />}
          className={isActive('/users') ? 'active' : ''}
        >
          Quản lý người dùng
        </MenuItem>

        <MenuItem
          icon={<FaTicketAlt />}
          component={<Link to="/tickets" />}
          className={isActive('/tickets') ? 'active' : ''}
        >
          Quản lý vé
        </MenuItem>

        <MenuItem
          icon={<MdExitToApp />}
          onClick={handleLogout}
          className="logout-menu-item"
        >
          Đăng xuất
        </MenuItem>
      </Menu>
    </Sidebar>
  );
};

export default CustomSidebar;
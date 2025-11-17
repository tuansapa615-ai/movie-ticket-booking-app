// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MovieManagement from './pages/MovieManagement.jsx';
import ShowtimeManagement from './pages/ShowtimeManagement.jsx';
import UserManagement from './pages/UserManagement.jsx';
import BannerManagement from './pages/BannerManagement.jsx';
import CinemaManagement from './pages/CinemaManagement.jsx';
import DefaultLayout from './layouts/DefaultLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HallManagement from './pages/HallManagement.jsx';
import FoodItemManagement from './pages/FoodItemManagement.jsx';
import SeatManagement from './pages/SeatManagement';
import SeatPricingManagement from './pages/SeatPricingManagement.jsx';
import TicketManagement from './pages/TicketManagement.jsx'
import { getToken, getUser, saveAuthData, removeAuthData } from './utils/auth.js';


const AppContent = () => {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getUser()); // 'user' is your state variable for the user object
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const ALLOWED_ADMIN_ROLES = ['admin', 'staff'];
  const ADMIN_ONLY_ROLES = ['admin'];

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getUser();

    const storedAuthError = sessionStorage.getItem('authError');
    if (storedAuthError) {
      setAuthError(storedAuthError);
      sessionStorage.removeItem('authError');
    }

    if (storedToken && storedUser) {
      if (!ALLOWED_ADMIN_ROLES.includes(storedUser.role)) {
        sessionStorage.setItem("authError", "Tài khoản của bạn không có quyền truy cập vào trang quản trị.");
        handleLogout();
      } else {
        setToken(storedToken);
        setUser(storedUser);
        if (location.pathname === '/' || location.pathname === '/login') {
            navigate('/dashboard', { replace: true });
        }
      }
    } else {
      setToken(null);
      setUser(null);
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  const handleLoginSuccess = (newToken, newUser) => {
    if (!ALLOWED_ADMIN_ROLES.includes(newUser.role)) {
      sessionStorage.setItem("authError", "Tài khoản của bạn không có quyền truy cập vào trang quản trị.");
      setToken(null);
      setUser(null);
      removeAuthData();
      navigate('/login', { replace: true });
    } else {
      setToken(newToken);
      setUser(newUser);
      saveAuthData(newToken, newUser);
      setAuthError(null);
      navigate('/dashboard', { replace: true });
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    removeAuthData();
    sessionStorage.setItem("authError", "Bạn đã đăng xuất hoặc phiên làm việc đã hết hạn.");
    setAuthError(null);
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route path="/login" element={
        (!token || !user || !ALLOWED_ADMIN_ROLES.includes(user.role)) ?
          <LoginPage onLoginSuccess={handleLoginSuccess} initialAuthError={authError}>
          </LoginPage> :
          <Navigate to="/dashboard" replace />
      } />

      <Route path="/" element={
        (!token || !user || !ALLOWED_ADMIN_ROLES.includes(user.role)) ?
          <Navigate to="/login" replace /> :
          <Navigate to="/dashboard" replace />
      } />

      <Route element={<ProtectedRoute allowedRoles={ALLOWED_ADMIN_ROLES} user={user} />}>
        <Route path="/" element={<DefaultLayout handleLogout={handleLogout} userRole={user?.role} />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="movies/all" element={<MovieManagement userRole={user?.role} />} />
          <Route path="showtimes" element={<ShowtimeManagement userRole={user?.role} />} />
          
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY_ROLES} user={user} redirectPath="/dashboard" />}>
              <Route path="seats" element={<SeatManagement userRole={user?.role} />} /> 
              <Route path="seat-pricing" element={<SeatPricingManagement userRole={user?.role} />}/>
              <Route path="tickets" element={<TicketManagement user={user} userRole={user?.role} />} />
              <Route path="users" element={<UserManagement userRole={user?.role} />} />
              <Route path="banners" element={<BannerManagement userRole={user?.role} />} />
              <Route path="cinemas" element={<CinemaManagement userRole={user?.role} />} />
              <Route path="halls" element={<HallManagement userRole={user?.role} />} />
              <Route path="food-items" element={<FoodItemManagement userRole={user?.role} />} />
          </Route>
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Route>
    </Routes>
  );
};

const MainApp = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default MainApp;

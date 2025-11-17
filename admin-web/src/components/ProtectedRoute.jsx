// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getToken, getUser } from '../utils/auth.js';

const ProtectedRoute = ({ allowedRoles }) => {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    // If no token or user, redirect to login page
    return <Navigate to="/" replace />;
  }

  // Check if user has one of the allowed roles
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If user does not have required role, redirect to a forbidden page or dashboard
    // For simplicity, we'll redirect to dashboard with an error.
    // In a real app, you might have a dedicated 403 page.
    alert("Bạn không có quyền truy cập vào tài nguyên này.");
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and authorized, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;

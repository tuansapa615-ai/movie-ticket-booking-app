// src/components/AppFooter.jsx
import React from 'react';

const AppFooter = () => {
  return (
    // Sử dụng các lớp Bootstrap
    <footer className="bg-white p-3 text-center text-muted border-top">
      <p>&copy; {new Date().getFullYear()} Aptech Cinemas Admin. All rights reserved.</p>
    </footer>
  );
};

export default AppFooter;

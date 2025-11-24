import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

const DashboardLayout = () => {
  return (
    <div>
      <Navbar />
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
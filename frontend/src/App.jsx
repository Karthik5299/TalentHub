import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider }         from './context/SocketContext';
import { AdminLayout, EmpLayout } from './components/common/Layouts';

import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

import AdminDash from './pages/admin/Dashboard';
import AdminEmps from './pages/admin/Employees';
import {
  AdminAttendance,
  AdminLeaves,
  AdminDepartments,
  AdminPayroll,
  AdminKin,
  AdminUsers,
} from './pages/admin/AdminPages';

import EmpDashboard from './pages/employee/EmpDashboard';
import EmpAttendance from './pages/employee/EmpAttendance';
import EmpLeaves from './pages/employee/EmpLeaves';
import EmpPayslips from './pages/employee/EmpPayslips';
import EmpProfile from './pages/employee/EmpProfile';

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-white/10 border-t-cyan-400 animate-spin" />
        <p className="mt-4 text-sm text-slate-300">Loading your workspace...</p>
      </div>
    </div>
  );
}

function Guard({ children, role, passwordChangeOnly = false }) {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) return <Loader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && !passwordChangeOnly) {
    return <Navigate to="/change-password" replace />;
  }

  if (!mustChangePassword && passwordChangeOnly) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return children;
}

function PublicOnly({ children }) {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) return <Loader />;

  if (user) {
    if (mustChangePassword) return <Navigate to="/change-password" replace />;
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />

      <Route
        path="/change-password"
        element={
          <Guard passwordChangeOnly>
            <ChangePasswordPage />
          </Guard>
        }
      />

      <Route
        path="/admin"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminDash />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminEmps />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminAttendance />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/leaves"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminLeaves />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminDepartments />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/payroll"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminPayroll />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/kin"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminKin />
            </AdminLayout>
          </Guard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Guard role="admin">
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          </Guard>
        }
      />

      <Route
        path="/employee"
        element={
          <Guard role="employee">
            <EmpLayout>
              <EmpDashboard />
            </EmpLayout>
          </Guard>
        }
      />
      <Route
        path="/employee/attendance"
        element={
          <Guard role="employee">
            <EmpLayout>
              <EmpAttendance />
            </EmpLayout>
          </Guard>
        }
      />
      <Route
        path="/employee/leaves"
        element={
          <Guard role="employee">
            <EmpLayout>
              <EmpLeaves />
            </EmpLayout>
          </Guard>
        }
      />
      <Route
        path="/employee/payslips"
        element={
          <Guard role="employee">
            <EmpLayout>
              <EmpPayslips />
            </EmpLayout>
          </Guard>
        }
      />
      <Route
        path="/employee/profile"
        element={
          <Guard role="employee">
            <EmpLayout>
              <EmpProfile />
            </EmpLayout>
          </Guard>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
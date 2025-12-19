import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './context/ThemeContext'
import { ThemeSwitcher } from './components/ui/ThemeSwitcher' // Placeholder for now

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import AdminDashboard from './pages/admin/AdminDashboard'
import ForgotPassword from './pages/ForgotPassword'
import UpdatePassword from './pages/UpdatePassword'
import DashboardLayout from './components/layout/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import Inventory from './pages/dashboard/Inventory'
import Workers from './pages/dashboard/Workers'
import Transactions from './pages/dashboard/Transactions'
import Reports from './pages/dashboard/Reports'
import Settings from './pages/dashboard/Settings'
import InvoiceGenerator from './pages/dashboard/InvoiceGenerator'
import MarketingHub from './pages/dashboard/MarketingHub'

// Layout Component (Only for Dashboard/Auth pages if needed, Home has its own layout)
const Layout = ({ children }) => {
  const { theme } = useTheme()
  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-300`}>
       {/* Note: Navbar is inside Home, so we might not need header here for Home route */}
       {/* But for now, let's keep it simple. If route is /, render children directly. */}
       {children}
    </div>
  )
}

import { ToastProvider } from './context/ToastContext'
import { OrganizationProvider } from './context/OrganizationContext'

function App() {
  return (
    <ToastProvider>
      <OrganizationProvider>
        <Layout>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Dashboard Routes (Protected) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="workers" element={<Workers />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="invoice" element={<InvoiceGenerator />} />
            <Route path="marketing" element={<MarketingHub />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Admin Route */}
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
      </OrganizationProvider>
    </ToastProvider>
  )
}

export default App

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './context/ThemeContext'
import { ThemeSwitcher } from './components/ui/ThemeSwitcher' // Placeholder for now

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import AdminDashboard from './pages/admin/AdminDashboard'
import DashboardLayout from './components/layout/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import Inventory from './pages/dashboard/Inventory'
import Workers from './pages/dashboard/Workers'
import Transactions from './pages/dashboard/Transactions'
import Reports from './pages/dashboard/Reports'
import Settings from './pages/dashboard/Settings'

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

function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Dashboard Routes (Protected) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="workers" element={<Workers />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Admin Route */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Layout>
    </ToastProvider>
  )
}

export default App

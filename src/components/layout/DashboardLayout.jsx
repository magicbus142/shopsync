import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, Receipt, Package, Settings, LogOut, Menu, X, Users as UsersIcon, Shield, FileText, BarChart3 } from 'lucide-react'
import { OrganizationSelector } from '../organization/OrganizationSelector'

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  // { icon: BarChart3, label: 'Reports', href: '/dashboard/reports' }, // Hidden for this version
  { icon: Package, label: 'Inventory', href: '/dashboard/inventory' },
  { icon: UsersIcon, label: 'Workers', href: '/dashboard/workers' },
  { icon: Receipt, label: 'Transactions', href: '/dashboard/transactions' },
  { icon: FileText, label: 'Invoice', href: '/dashboard/invoice' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
]

export default function DashboardLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [shopName, setShopName] = useState('ShopSync')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingRole, setLoadingRole] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 1. Get Shop Details
          const { data: profile } = await supabase.from('profiles').select('shop_name').eq('id', user.id).maybeSingle()
          if (profile?.shop_name) setShopName(profile.shop_name)
          
          // 2. Check Admin Status (Simple Email Check)
          const ADMIN_EMAILS = ['swamy@magicbus142.com']
          setIsAdmin(ADMIN_EMAILS.includes(user.email))
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoadingRole(false)
      }
    }
    fetchProfile()
  }, [])
  
  // Menu Logic: Admins see Admin Link + Standard Items
  let menuItems = [...SIDEBAR_ITEMS]
  if (isAdmin) {
      menuItems.push({ icon: Shield, label: 'Platform Admin', href: '/admin' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground transition-colors duration-300">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-full shadow-lg border border-border"
      >
        {isOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border p-6 flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-8 px-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {shopName}
            </h1>
            <div className="mt-4">
                <OrganizationSelector />
            </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto py-2">
          {menuItems.map((item) => {
            // Check for potential sub-paths matching? For now exact or startsWith
            const isActive = location.pathname === item.href
            return (
              <Link 
                key={item.href} 
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
                onClick={() => setIsOpen(false)} // Close menu on mobile click
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="pt-4 mt-auto border-t border-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all font-medium"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden md:ml-0 bg-background">
        <div className="max-w-7xl mx-auto space-y-8">
            {children || <Outlet />}
        </div>
      </main>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

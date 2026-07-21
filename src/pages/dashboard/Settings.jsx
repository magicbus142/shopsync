import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Lock, 
  Palette, 
  CreditCard, 
  LayoutGrid, 
  ShieldCheck,
  ChevronRight,
  Store,
  Upload
} from 'lucide-react'
import { useTheme, themes } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  
  // Navigation Items
  const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Shop Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your shop preferences and security.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full lg:w-48 flex-shrink-0">
           <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
           </nav>
        </div>

        {/* content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
             >
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'appearance' && <AppearanceTab />}
                {activeTab === 'billing' && <BillingTab />}
             </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// --- Sub Components ---

function ProfileTab() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ 
    shopName: '', 
    email: '', 
    fullName: '',
    category: 'Electronics & Retail' // Default
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
            const { data } = await supabase.from('profiles').select('shop_name, full_name').eq('id', user.id).single()
            setProfile(p => ({
                ...p,
                email: user.email,
                shopName: data?.shop_name || 'My New Shop',
                fullName: data?.full_name || 'Admin',
            }))
        }
    } catch (e) {
        console.error("Failed to fetch profile", e)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
        // Update Profile
        const { error } = await supabase
            .from('profiles')
            .update({ shop_name: profile.shopName, updated_at: new Date() })
            .eq('id', user.id)

        if (error) throw error
        
        // Also try to update org name
        await supabase
            .from('organizations')
            .update({ name: profile.shopName })
            .eq('owner_id', user.id)

        setMessage('Settings updated successfully!')
        setTimeout(() => window.location.reload(), 1000) // Reload to reflect changes globally
    } catch (err) {
        console.error(err)
        setMessage('Failed to update settings.')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Main Card */}
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
         <div className="flex items-start gap-6 mb-8">
             <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 shadow-lg flex-shrink-0 relative overflow-visible group">
                 {/* Placeholder Image feeling */}
                 <div className="absolute inset-0 flex items-center justify-center">
                     <Store className="w-10 h-10 text-white/50" />
                 </div>
                 <button className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                     <Upload className="w-4 h-4" />
                 </button>
             </div>
             <div className="mt-2">
                 <h3 className="text-xl font-bold text-foreground">{profile.shopName || 'My New Shop'}</h3>
                 <p className="text-sm text-muted-foreground mt-1">Created on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
             </div>
         </div>

         <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Shop Name</label>
                    <input 
                        type="text"
                        value={profile.shopName}
                        onChange={(e) => setProfile({...profile, shopName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                    <input 
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Business Category</label>
                 <select 
                    value={profile.category}
                    onChange={(e) => setProfile({...profile, category: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 outline-none"
                 >
                     <option>Electronics & Retail</option>
                     <option>Clothing & Apparel</option>
                     <option>Grocery & Supermarket</option>
                     <option>Pharmacy & Health</option>
                     <option>Other</option>
                 </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                    Discard Changes
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                >
                    {loading ? 'Saving...' : 'Update Settings'}
                </button>
            </div>
            {message && <p className="text-center text-sm text-green-600 font-medium">{message}</p>}
         </form>
      </div>

      {/* 2FA Section - Custom Style */}
      <div className="bg-card border rounded-xl overflow-hidden relative shadow-sm" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="p-6">
              <h4 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                  Two-Factor Authentication
              </h4>
              <p className="text-sm text-muted-foreground mb-6">Add an extra layer of security to your account by enabling 2FA.</p>
              
              <button disabled className="px-5 py-2.5 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400 font-bold text-sm rounded-lg opacity-60 cursor-not-allowed flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Enable 2FA Securely (Coming Soon)
              </button>
          </div>
      </div>
    </div>
  )
}

function SecurityTab() {
    const [passwords, setPasswords] = useState({ new: '', confirm: '' })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handlePasswordChange = async (e) => {
        e.preventDefault()
        if (passwords.new !== passwords.confirm) {
            setMessage('Passwords do not match')
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: passwords.new })
            if (error) throw error
            setMessage('Password updated successfully')
            setPasswords({ new: '', confirm: '' })
        } catch (error) {
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Password Management
             </h3>
             <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <input 
                        type="password" 
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        minLength={6}
                        required
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input 
                        type="password" 
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        minLength={6}
                        required
                    />
                 </div>
                 <button disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm">
                     {loading ? 'Updating...' : 'Update Password'}
                 </button>
                 {message && <p className="text-sm mt-2">{message}</p>}
             </form>
        </div>
    )
}

function AppearanceTab() {
    const { theme, setTheme } = useTheme()
    return (
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Theme Preferences
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {themes.map((t) => {
                const colors = {
                    light: 'bg-blue-500', 
                    dark: 'bg-slate-900',
                    midnight: 'bg-indigo-900',
                    nature: 'bg-emerald-800', 
                    sunset: 'bg-orange-800',
                }
                return (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      disabled={t.value !== 'light'}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group flex flex-col gap-3 ${
                        theme === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      } ${t.value !== 'light' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-full h-20 rounded-lg shadow-sm border border-border ${colors[t.value] || 'bg-gray-200'}`} />
                      <span className="font-medium text-sm">{t.name}</span>
                      
                      {t.value !== 'light' && (
                         <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                 <Lock className="w-3 h-3" /> Soon
                             </span>
                         </div>
                      )}
                    </button>
                )
              })}
            </div>
        </div>
    )
}

function BillingTab() {
    return (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground">Billing & Plans</h3>
            <p className="mt-2">You are currently on the <span className="font-bold text-primary">Free Tier</span>.</p>
            <p className="text-sm mt-1">Upgrade options coming soon.</p>
        </div>
    )
}

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Lock, Users } from 'lucide-react'
import { useTheme, themes } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Profile State
  const [profile, setProfile] = useState({ shopName: '', email: '' })
  
  // Fetch data on mount
  useEffect(() => {
     fetchProfile()
  }, [])
  
  async function fetchProfile() {
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
              const { data } = await supabase.from('profiles').select('shop_name, full_name').eq('id', user.id).single()
              setProfile({
                  email: user.email,
                  shopName: data?.shop_name || 'My Shop',
                  fullName: data?.full_name || 'Admin'
              })
          }
      } catch (e) {
          console.error("Failed to fetch profile", e)
      }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (passwords.new !== passwords.confirm) {
        setMessage({ type: 'error', text: 'Passwords do not match' })
        return
    }

    if (passwords.new.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
        return
    }

    try {
        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password: passwords.new })

        if (error) throw error

        setMessage({ type: 'success', text: 'Password updated successfully' })
        setPasswords({ new: '', confirm: '' })
    } catch (error) {
        setMessage({ type: 'error', text: 'Error updating password: ' + error.message })
    } finally {
        setLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your shop preferences.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {profile.shopName.charAt(0).toUpperCase()}
             </div>
             <div>
                <h3 className="text-xl font-bold">{profile.shopName}</h3>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                   <Users className="w-4 h-4" /> {profile.fullName} 
                   <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                   {profile.email}
                </p>
             </div>
          </div>
          <button className="text-primary text-sm font-medium hover:underline">Edit Profile</button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
         <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
           <Lock className="w-5 h-5" /> Security
         </h3>
         <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {message.text && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                {message.text}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input 
                type="password" 
                required
                minLength={6}
                className="w-full px-3 py-2 border border-input rounded-md bg-background" 
                placeholder="Enter new password"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <input 
                type="password" 
                required
                minLength={6}
                className="w-full px-3 py-2 border border-input rounded-md bg-background" 
                placeholder="Confirm new password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Update Password...' : 'Update Password'}
            </button>
         </form>
      </div>


      <div className="bg-card border border-border rounded-xl p-6">
         <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
           <SettingsIcon className="w-5 h-5" /> Appearance
         </h3>
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                     className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group flex items-center gap-3 ${
                       theme === t.value ? 'border-primary bg-primary/5' : 'border-border'
                     } ${t.value !== 'light' ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
                   >
                     <div className={`w-6 h-6 rounded-full border border-black/10 shadow-sm ${colors[t.value] || 'bg-gray-200'}`} />
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
      </div>
      
    </motion.div>
  )
}

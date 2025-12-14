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
  const [profile, setProfile] = useState({ shopName: '', email: '', fullName: '' })
  const [user, setUser] = useState(null)
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ fullName: '', shopName: '', email: '' })
  
  // Fetch data on mount
  useEffect(() => {
     fetchProfile()
  }, [])
  
  async function fetchProfile() {
      try {
          const { data: { user } } = await supabase.auth.getUser()
          setUser(user)
          if (user) {
              const { data } = await supabase.from('profiles').select('shop_name, full_name').eq('id', user.id).single()
              setProfile({
                  email: user.email,
                  shopName: data?.shop_name || 'My Shop',
                  fullName: data?.full_name || 'Admin'
              })
              // Init edit form
              setEditForm({
                  email: user.email,
                  shopName: data?.shop_name || 'My Shop',
                  fullName: data?.full_name || 'Admin'
              })
          }
      } catch (e) {
          console.error("Failed to fetch profile", e)
      }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Update Profile (Name, Shop Name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.fullName,
          shop_name: editForm.shopName,
          updated_at: new Date()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Update Organization Name (Best Effort)
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ name: editForm.shopName })
        .eq('owner_id', user.id) 
      
      if (orgError) console.warn("Could not update org name:", orgError)

      // 3. Update Email (if changed)
      let emailMessage = ''
      if (editForm.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: editForm.email })
        if (authError) throw authError
        emailMessage = ' Please check your new email to confirm the change.'
      }

      setMessage({ type: 'success', text: `Profile updated successfully!${emailMessage}` })
      setIsEditing(false)
      fetchProfile() // Refresh data
      
      // Reload if shop name changed to update context/sidebar
      if (profile.shopName !== editForm.shopName) {
         setTimeout(() => window.location.reload(), 1500)
      }

    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
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
      
      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in fade-in zoom-in-95">
             <h2 className="text-xl font-bold mb-4 text-foreground">Edit Profile</h2>
             <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                   <label className="text-sm font-medium text-muted-foreground block mb-1">Full Name</label>
                   <input 
                      type="text" 
                      value={editForm.fullName}
                      onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                   />
                </div>
                <div>
                   <label className="text-sm font-medium text-muted-foreground block mb-1">Shop Name</label>
                   <input 
                      type="text" 
                      value={editForm.shopName}
                      onChange={e => setEditForm({...editForm, shopName: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                   />
                </div>
                <div>
                   <label className="text-sm font-medium text-muted-foreground block mb-1">Email Address</label>
                   <input 
                      type="email" 
                      value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                   />
                   <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                     * Changing email requires confirmation.
                   </p>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                   <button 
                     type="button" 
                     onClick={() => setIsEditing(false)}
                     className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg"
                   >
                     {loading ? 'Saving...' : 'Save Changes'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your shop preferences.</p>
      </div>
      
      {/* Global Message */}
      {message.text && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
            {message.text}
          </div>
      )}

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
          <button 
            onClick={() => setIsEditing(true)}
            className="text-primary text-sm font-medium hover:underline"
          >
            Edit Profile
          </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
         <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
           <Lock className="w-5 h-5" /> Security
         </h3>
         <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
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

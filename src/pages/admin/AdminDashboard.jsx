import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'

export default function AdminDashboard() {
  const [whitelist, setWhitelist] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(null) // null = loading

  const [error, setError] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
        // Timeout Promise
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Admin check timed out. Database might be locked or slow.')), 5000)
        )

        // Admin Check Promise
        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data } = await supabase
                .from('admin_users')
                .select('email')
                .eq('email', user.email)
                .maybeSingle()
              
              if (data) {
                setIsAdmin(true)
                fetchWhitelist()
              } else {
                setIsAdmin(false)
              }
            } else {
              setIsAdmin(false)
            }
        }

        // Race them
        await Promise.race([check(), timeout])
    } catch (err) {
        console.error('Admin Check Error:', err)
        setError(err.message)
        setIsAdmin(false) // Stop loading state
    }
  }

  const fetchWhitelist = async () => {
    const { data, error } = await supabase.from('whitelist').select('*').order('created_at', { ascending: false })
    if (data) setWhitelist(data)
    if (error) console.error('Error fetching whitelist:', error)
  }

  const handleAddEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('whitelist').insert([{ email: newEmail }])
    
    if (error) {
      alert('Error adding email: ' + error.message)
    } else {
      setNewEmail('')
      fetchWhitelist()
    }
    setLoading(false)
  }

  const handleRemoveEmail = async (id) => {
    if(!confirm('Are you sure?')) return
    const { error } = await supabase.from('whitelist').delete().eq('id', id)
    if (!error) fetchWhitelist()
    else alert('Error removing email: ' + error.message)
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="bg-destructive/10 p-4 rounded-xl text-destructive max-w-md text-center">
            <h3 className="font-bold text-lg mb-2">Something went wrong</h3>
            <p>{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Retry
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (isAdmin === false) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
          Access Denied. Admin only.
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Client Management</h1>
          <div className="text-sm text-muted-foreground">
            Manage who can access the application
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="md:col-span-1">
            <div className="bg-card p-6 rounded-2xl border shadow-sm sticky top-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500"/> Add Client
              </h2>
              <form onSubmit={handleAddEmail} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Client Email</label>
                  <input 
                    type="email" 
                    required
                    placeholder="client@example.com"
                    className="w-full p-3 mt-1 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This email will be able to sign up immediately.
                  </p>
                </div>
                <button 
                  disabled={loading} 
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Adding...' : 'Whiltelist Email'}
                </button>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="md:col-span-2">
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-bold mb-4">Whitelisted Clients ({whitelist.length})</h2>
              <div className="space-y-2">
                {whitelist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {item.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-mono text-sm">{item.email}</span>
                      </div>
                      <button 
                      onClick={() => handleRemoveEmail(item.id)}
                      className="p-2 hover:bg-red-100 text-muted-foreground hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                ))}
                {whitelist.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    No emails in whitelist.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

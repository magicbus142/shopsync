import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, Lock } from 'lucide-react'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a session (hash fragment from email link works automatically with supabase client)
    // However, sometimes it's good to verify
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            // User is here to recover password
        }
    })
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      alert('Password updated successfully!')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl">
        
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4">
               <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Set New Password</h1>
            <p className="text-muted-foreground mt-2">Please enter your new password below.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-sm p-4 rounded-xl mb-6 text-center border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

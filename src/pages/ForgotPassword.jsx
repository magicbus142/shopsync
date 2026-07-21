import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // Configure the redirect URL to point to our update-password page
      // Prioritize VITE_SITE_URL if available (for production), fallback to window.location.origin
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
      const redirectTo = `${siteUrl}/update-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      setMessage('Check your email for the password reset link!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl">
        <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </Link>
        
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4">
               <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Forgot Password?</h1>
            <p className="text-muted-foreground mt-2">Enter your email to receive a reset link.</p>
        </div>

        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 text-sm p-4 rounded-xl mb-6 text-center border border-green-200 dark:border-green-900">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-sm p-4 rounded-xl mb-6 text-center border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  )
}

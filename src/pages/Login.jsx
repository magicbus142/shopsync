import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/dashboard')
      }
    }
    checkUser()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password. If you haven\'t signed up, please create an account.')
      setLoading(false)
    } else {
      // Auth successful
      localStorage.setItem('user', JSON.stringify(authData.user))
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-0 bg-secondary/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl h-[85vh] bg-card rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20"
      >
        
        {/* Left Side - Brand / Art */}
        <div className="hidden md:flex w-1/2 bg-[#5d7df3] relative flex-col justify-center items-center text-white p-12 overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-20 w-16 h-16 bg-white/20 rounded-full backdrop-blur-md" />
          
          <div className="relative z-10 text-center space-y-6">
             <h1 className="text-5xl font-bold leading-tight">Adventure <br/> start here</h1>
             <p className="text-blue-100 text-lg max-w-sm mx-auto">Create an account to Join Our Community</p>
          </div>

          <div className="absolute bottom-12 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 bg-card p-8 md:p-16 flex flex-col justify-center relative">
          
          <div className="text-center mb-10">
             <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                 <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
               </svg>
             </div>
             <h2 className="text-2xl font-bold text-foreground">Hello ! Welcome back</h2>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input/50 focus:bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pl-10"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute left-3 top-3.5 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input/50 focus:bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pl-10"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute left-3 top-3.5 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-500">Reset Password!</Link>
              </div>

              <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5d7df3] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center transform active:scale-[0.98]"
              >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Login'}
              </button>
          </form>
          
          <div className="mt-8 flex items-center gap-4">
             <div className="h-px bg-border flex-1" />
             <span className="text-xs text-muted-foreground font-medium uppercase">or</span>
             <div className="h-px bg-border flex-1" />
          </div>

          {/* <div className="mt-6 flex justify-center gap-4"> */}
             {/* Social Placeholders */}
             {/* <button className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
               <span className="font-bold text-lg">G</span>
             </button>
             <button className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-blue-600">
               <span className="font-bold text-lg">f</span>
             </button>
          </div> */}

          <div className="mt-8 text-center text-sm text-muted-foreground">
             Don't Have an account? <Link to="/signup" className="text-blue-500 font-semibold hover:underline">Create Account</Link>
          </div>

        </div>
      </motion.div>
    </div>
  )
}

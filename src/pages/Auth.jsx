import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, Lock, Mail, CheckCircle2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import Lottie from 'lottie-react'

// Animations
import saasAnimation from '../assets/Login.json'
import trackerAnimation from '../assets/Login.json'

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  
  const isLoginMode = location.pathname === '/login'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/dashboard')
      }
    }
    checkUser()
  }, [navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!isLoginMode && !agreedToTerms) {
        setError('Please agree to the Terms & Conditions')
        setLoading(false)
        return
    }

    try {
        if (isLoginMode) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (authError) throw authError
            navigate('/dashboard')
        } else {
            const { data, error: signupError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
            })
            if (signupError) throw signupError
            
            if (data.user && data.session) {
                await supabase.from('profiles').insert([{ id: data.user.id }])
                navigate('/onboarding')
            } else if (data.user && !data.session) {
                success('Signup successful! Please check your email to confirm.')
                setLoading(false)
            }
        }
    } catch (err) {
        console.error('Auth error:', err)
        setError(err.message || 'Authentication failed. Please check your credentials.')
        setLoading(false)
    }
  }

  const sidebarContent = {
    login: {
        title: "Adventure \n start here",
        subtitle: "Create an account to Join Our Community",
        index: 1
    },
    signup: {
        title: "Join Our \n Community",
        subtitle: "Start your journey with us today.",
        index: 0
    }
  }

  const currentSidebar = isLoginMode ? sidebarContent.login : sidebarContent.signup

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-0 bg-secondary/30 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl h-[85vh] bg-card rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-border"
      >
        
        {/* Left Side - Animated Sidebar */}
        <div className="hidden md:flex w-1/2 bg-[#5d7df3] relative flex-col justify-center items-center text-white p-12 overflow-hidden">
          {/* Decorative Background Elements */}
          <motion.div 
            animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ 
                scale: [1, 1.2, 1],
                x: [0, 10, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl" 
          />
          <div className="absolute top-20 right-20 w-16 h-16 bg-white/20 rounded-full backdrop-blur-md" />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Lottie Animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={isLoginMode ? 'login-lottie' : 'signup-lottie'}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[320px] mb-8"
                >
                    <Lottie 
                        animationData={isLoginMode ? trackerAnimation : saasAnimation} 
                        loop={true} 
                        className="w-full h-full drop-shadow-2xl"
                    />
                </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div 
                key={isLoginMode ? 'login' : 'signup'}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center space-y-6"
              >
                 <h1 className="text-5xl font-bold leading-tight whitespace-pre-line">
                   {currentSidebar.title}
                 </h1>
                 <p className="text-blue-100 text-lg max-w-sm mx-auto font-medium">
                   {currentSidebar.subtitle}
                 </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-12 flex gap-3">
            {[0, 1, 2].map((i) => (
                <div 
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                        (isLoginMode && i === 1) || (!isLoginMode && i === 0) 
                        ? 'w-6 bg-white' 
                        : 'w-2 bg-white/40'
                    }`}
                />
            ))}
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 bg-card p-8 md:p-16 flex flex-col justify-center relative overflow-y-auto">
          
          <div className="text-center mb-10">
             <motion.div 
                key={isLoginMode ? 'login-icon' : 'signup-icon'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner"
             >
                {isLoginMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                        <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                    </svg>
                ) : (
                    <CheckCircle2 className="w-8 h-8" />
                )}
             </motion.div>
             <h2 className="text-2xl font-bold text-foreground">
                {isLoginMode ? 'Hello ! Welcome back' : 'Create Account'}
             </h2>
             <p className="text-muted-foreground mt-2 font-medium">
                {isLoginMode ? 'Sign in to continue' : 'Join us today!'}
             </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
                key={isLoginMode ? 'login-form' : 'signup-form'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleAuth} 
                className="space-y-6"
            >
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-sm p-3 rounded-xl border border-red-100 dark:border-red-900/50 text-center animate-shake">
                    {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-input/30 focus:bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pl-12"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-border bg-input/30 focus:bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pl-12"
                    placeholder={isLoginMode ? "••••••••••••" : "Create a password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                    <input 
                        type="checkbox" 
                        required={!isLoginMode}
                        checked={isLoginMode ? undefined : agreedToTerms}
                        onChange={isLoginMode ? undefined : (e) => setAgreedToTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="font-medium">
                        {isLoginMode ? 'Remember me' : 'I agree to the Terms & Conditions'}
                    </span>
                  </label>
                  {isLoginMode && (
                    <Link to="/forgot-password" size="sm" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
                        Reset Password!
                    </Link>
                  )}
              </div>

              <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5d7df3] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center transform active:scale-[0.98] group"
              >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <div className="flex items-center gap-2">
                        {isLoginMode ? 'Login' : 'Sign Up'}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
              </button>
            </motion.form>
          </AnimatePresence>
          
          <div className="mt-10 flex items-center gap-4">
             <div className="h-px bg-border flex-1" />
             <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">or</span>
             <div className="h-px bg-border flex-1" />
          </div>

          <div className="mt-8 text-center text-sm font-medium text-muted-foreground">
             {isLoginMode ? (
                <>Don't Have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline underline-offset-4 ml-1">Create Account</Link></>
             ) : (
                <>Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline underline-offset-4 ml-1">Login here</Link></>
             )}
          </div>

        </div>
      </motion.div>
    </div>
  )
}

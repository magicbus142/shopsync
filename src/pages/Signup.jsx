import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Signup() {
  const [step, setStep] = useState(1) // 1: Email Check, 2: Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleCheckEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const trimmedEmail = email.trim()

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Invalid email format.')
      setLoading(false)
      return
    }

    // Check Whitelist
    try {
      const { data, error } = await supabase
        .from('whitelist')
        .select('email')
        .eq('email', trimmedEmail)
        .single()

      if (error || !data) {
        setError('This email has not been invited to join.')
      } else {
        setStep(2)
      }
    } catch (err) {
      setError('Error checking invitation status.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const trimmedEmail = email.trim()

    // Proceed with Signup
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    })

    if (error) {
      console.error('SUPABASE SIGNUP ERROR:', error)
      setError(error.message)
      setLoading(false)
    } else {
      // Create initial profile entry if user creation was successful
      if (data.user && data.session) {
        await supabase.from('profiles').insert([{ id: data.user.id }])
        navigate('/onboarding')
      } else if (data.user && !data.session) {
          alert('Signup successful! Please check your email to confirm your account.')
          setLoading(false)
      } else {
          alert('Something went wrong.')
          setLoading(false)
      }
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
             <h1 className="text-5xl font-bold leading-tight">Join Our <br/> Community</h1>
             <p className="text-blue-100 text-lg max-w-sm mx-auto">Start your journey with us today.</p>
          </div>

          <div className="absolute bottom-12 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 bg-card p-8 md:p-16 flex flex-col justify-center relative">
          
          <div className="text-center mb-10">
             <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4">
               {step === 1 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.75 3c1.995 0 3.804 1.005 5.126 2.552a.75.75 0 01.077 0C14.446 4.005 16.255 3 18.25 3c3.036 0 5.5 2.322 5.5 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
               ) : (
                  <CheckCircle2 className="w-8 h-8"/>
               )}
             </div>
             <h2 className="text-2xl font-bold text-foreground">
                {step === 1 ? 'Check Invitation' : 'Create Password'}
             </h2>
             <p className="text-muted-foreground mt-2">
                {step === 1 ? 'Enter your email to verify invite.' : 'Set up security for your account.'}
             </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCheckEmail} 
                className="space-y-6"
              >
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
                  
                  <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#5d7df3] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center transform active:scale-[0.98]"
                  >
                      {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                        <span className="flex items-center gap-2">Verify Email <ArrowRight className="w-4 h-4"/></span>
                      )}
                  </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignup} 
                className="space-y-6"
              >
                  {/* Read Only Email Display */}
                  <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium">{email}</span>
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-blue-500 font-semibold hover:underline">Change</button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-border bg-input/50 focus:bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pl-10"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="absolute left-3 top-3.5 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                      <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" required />
                        I agree to the Terms & Conditions
                      </label>
                  </div>

                  <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#5d7df3] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center transform active:scale-[0.98]"
                  >
                      {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Complete Sign Up'}
                  </button>
              </motion.form>
            )}
          </AnimatePresence>
          
          <div className="mt-8 flex items-center gap-4">
             <div className="h-px bg-border flex-1" />
             <span className="text-xs text-muted-foreground font-medium uppercase">or</span>
             <div className="h-px bg-border flex-1" />
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
             Already have an account? <Link to="/login" className="text-blue-500 font-semibold hover:underline">Login here</Link>
          </div>

        </div>
      </motion.div>
    </div>
  )
}

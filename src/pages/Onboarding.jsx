import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, Store, User, CheckCircle2 } from 'lucide-react'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    fullName: '',
    shopName: '',
    shopType: '', // Added Shop / Business Type
    role: 'owner',
    currency: 'USD',
    features: ['inventory', 'workers', 'transactions', 'reports'] // Default all enabled
  })

  // Check Session on Mount
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // give it a moment in case it's a redirect flow
        setTimeout(async () => {
             const { data: { session: retrySession } } = await supabase.auth.getSession()
             if (!retrySession) {
                 alert('Please login first.')
                 navigate('/login')
             }
        }, 1000)
      }
    }
    checkSession()
  }, [navigate])

  const toggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature) 
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('No authenticated user. Please login again.')

      // 1. Create Organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
            name: formData.shopName,
            owner_id: user.id,
            plan_key: 'free', // Default to free plan
            shop_type: formData.shopType // Save shop type
        }])
        .select()
        .single()

      if (orgError) {
          console.error("Error creating org:", orgError)
          throw new Error("Failed to create organization: " + orgError.message)
      }

      // 2. Add User as Owner to Organization Members (if trigger doesn't do it automatically, wait, we didn't add trigger for that)
      // Our previous logic was manual insert.
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
            organization_id: org.id,
            user_id: user.id,
            role: 'owner'
        }])

      if (memberError) {
           console.error("Error adding member:", memberError)
           // Continue anyway as profile update is next, but warn?
      }

      // 3. Update Profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.fullName,
          shop_name: formData.shopName,
          role: formData.role,
          currency: formData.currency,
          features: formData.features,
          onboarded: true,
          updated_at: new Date()
        })

      if (error) throw error

      // Success
      // Force reload or just navigate? OrganizationProvider might need a refresh.
      // Easiest is to window.location.reload() or let Context handle it on mount of Dashboard
      navigate('/dashboard')
      window.location.reload() // Ensure context picks up new org
    } catch (error) {
      console.error('Onboarding Error:', error)
      alert(`Failed to save profile: ${error.message || error.error_description || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-8"
      >
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
           {[1, 2, 3].map(s => (
             <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
           ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">Tell us about yourself</h2>
                <p className="text-muted-foreground">This helps us personalize your experience.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-input bg-background"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => setStep(2)}
                  disabled={!formData.fullName}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <Store className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">Setup your Workspace</h2>
                <p className="text-muted-foreground">Create a home for your team.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Shop / Company Name</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-input bg-background"
                    placeholder="Acme Corp"
                    value={formData.shopName}
                    onChange={e => setFormData({...formData, shopName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shop / Business Type</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-input bg-background"
                    value={formData.shopType}
                    onChange={e => setFormData({...formData, shopType: e.target.value})}
                  >
                    <option value="">Select a business type...</option>
                    <option value="grocery">Grocery Shop</option>
                    <option value="mobile">Mobile & Electronics</option>
                    <option value="pharmacy">Pharmacy / Medical</option>
                    <option value="apparel">Apparel & Clothing</option>
                    <option value="restaurant">Restaurant / Café</option>
                    <option value="hardware">Hardware / Construction</option>
                    <option value="other">Other Business</option>
                  </select>
                </div>
                <div className="flex gap-3">
                   <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-input rounded-xl font-semibold hover:bg-muted"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!formData.shopName || !formData.shopType}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">You're all set!</h2>
                <p className="text-muted-foreground">Ready to jump into your new dashboard?</p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-xl mb-6 space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Name:</span>
                   <span className="font-medium">{formData.fullName}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Workspace:</span>
                   <span className="font-medium">{formData.shopName}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Business Type:</span>
                   <span className="font-medium capitalize">{formData.shopType}</span>
                 </div>
              </div>

              <div className="flex gap-3">
                   <button 
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 border border-input rounded-xl font-semibold hover:bg-muted"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto"/> : 'Launch Dashboard'}
                  </button>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

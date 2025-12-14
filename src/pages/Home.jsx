import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import HeroAnimation from '../components/features/HeroAnimation'
import FeaturesBento from '../components/features/FeaturesBento'
import Pricing from '../components/features/Pricing'

export default function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/dashboard')
      }
    }
    checkUser()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-background to-background opacity-70"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-primary mb-8 border border-secondary/20 shadow-sm animate-fade-in-up">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>AI-Powered Business Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight mb-8 leading-tight">
              Master Your Business Data with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Confidence</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop guessing. Start knowing. ShopSync brings professional-grade data intelligence to small businesses. Track inventory, manage transactions, and unlock AI-driven insights in one beautiful dashboard.  
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                to="/signup" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-foreground bg-card border border-border hover:bg-accent/10 hover:border-accent transition-all shadow-sm hover:shadow-md"
              >
                Live Demo
              </Link>
            </div>
          </div>
          
          {/* Hero Animation */}
          <div className="mt-20 relative rounded-2xl border border-border bg-white/30 backdrop-blur-xl shadow-2xl overflow-hidden p-2 group">
            <div className="rounded-xl overflow-hidden bg-muted/30 aspect-[16/9] flex items-center justify-center relative">
               <HeroAnimation />
               
               <div className="absolute inset-0 flex items-center justify-center bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="bg-card/90 backdrop-blur text-foreground px-6 py-3 rounded-full font-semibold shadow-lg">Interactive Dashboard Preview</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (Bento Grid) */}
      <div id="features">
        <FeaturesBento />
      </div>

      {/* Pricing Section - Hidden for now to target small shops
      <div id="pricing">
        <Pricing />
      </div>
      */}

      {/* CTA Section */}
      <section className="py-24 bg-muted/50 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50"></div>
        <div className="max-w-4xl mx-auto px-4 relative text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-8">Ready to transform your business?</h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of small business owners who are making smarter decisions with ShopSync. 
            No credit card required for trial.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <Link 
                to="/signup" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-1"
              >
                Get Started Now
              </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

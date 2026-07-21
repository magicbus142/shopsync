import React, { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DashboardPreview from '../components/features/DashboardPreview'
import FeaturesBento from '../components/features/FeaturesBento'
import Testimonials from '../components/features/Testimonials'
import HowItWorks from '../components/features/HowItWorks'
import FAQ from '../components/features/FAQ'
import Pricing from '../components/features/Pricing'
import BusinessImpact from '../components/features/BusinessImpact'

gsap.registerPlugin(ScrollTrigger)

export default function Home() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  
  useGSAP(() => {
    // Hero Entrance
    const tl = gsap.timeline()
    
    tl.from('.hero-badge', { y: -20, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from('.hero-title', { y: 30, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.4')
      .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.hero-btn', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' }, '-=0.4')
      .from('.hero-preview', { scale: 0.95, opacity: 0, duration: 1.2, ease: 'power2.out' }, '-=0.8')

    // Scroll Animations for Features
    gsap.from('#features', {
      scrollTrigger: {
        trigger: '#features',
        start: 'top 80%',
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    })

    // Scroll Animation for CTA
    gsap.from('.cta-section', {
      scrollTrigger: {
        trigger: '.cta-section',
        start: 'top 80%',
      },
      scale: 0.95,
      opacity: 0,
      duration: 1,
      ease: 'power2.out'
    })
    
  }, { scope: heroRef })

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
    <div ref={heroRef} className="min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-background to-background opacity-70"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="hero-badge inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-primary mb-8 border border-secondary/20 shadow-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>AI-Powered Business Intelligence</span>
            </div>
            <h1 className="hero-title text-5xl md:text-7xl font-extrabold text-foreground tracking-tight mb-8 leading-tight">
              Master Your Business Data with <span className="text-primary">Confidence</span>
            </h1>
            <p className="hero-subtitle text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop guessing. Start knowing. ShopSync brings professional-grade data intelligence to small businesses. Track inventory, manage transactions, and unlock AI-driven insights in one beautiful dashboard.  
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                to="/signup" 
                className="hero-btn inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                to="/login" 
                className="hero-btn inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-foreground bg-card border border-border hover:bg-accent/10 hover:border-accent transition-all shadow-sm hover:shadow-md"
              >
                Live Demo
              </Link>
            </div>
          </div>
          
          {/* Hero Animation */}
          <div className="hero-preview mt-20 relative">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none z-10"></div>
             <DashboardPreview />
          </div>
        </div>
      </section>
      
      {/* Business Impact Section */}
      <BusinessImpact />

      {/* Features Section (Bento Grid) */}
      <div id="features">
        <FeaturesBento />
      </div>

      {/* How It Works Section */}
      {/* <HowItWorks /> */}

      {/* Testimonials Section */}
      {/* <Testimonials /> */}

      {/* FAQ Section */}
      {/* <FAQ /> */}

      {/* CTA Section */}
      <section className="cta-section py-24 bg-muted/50 border-t border-border relative overflow-hidden">
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

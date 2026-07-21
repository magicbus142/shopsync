import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold bg-clip-text bg-gradient-to-r from-primary to-secondary">
                ShopSync
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Features
            </a>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-foreground border border-border hover:bg-muted/50 px-4 py-2 rounded-lg font-medium transition-all"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 flex items-center group"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-4 pb-6 pt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <a
            href="#features"
            className="block text-muted-foreground hover:text-primary transition-colors font-medium py-2"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </a>
          <Link
            to="/login"
            className="block text-center text-foreground border border-border hover:bg-muted/50 px-4 py-3 rounded-lg font-medium transition-all"
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-primary/20"
            onClick={() => setMobileOpen(false)}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </nav>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'

export default function Navbar() {
  const { theme } = useTheme()

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold bg-clip-text  bg-gradient-to-r from-primary to-secondary">
                ShopSync
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Features
            </a>
            {/* <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Pricing
            </a> */}
            <div className="flex items-center space-x-4">
              {/* <ThemeSwitcher /> */}
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
        </div>
      </div>
    </nav>
  )
}

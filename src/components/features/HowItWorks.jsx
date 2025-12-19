import React from 'react'
import { UserPlus, Database, TrendingUp, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    id: 1,
    icon: UserPlus,
    title: "Create Account",
    desc: "Sign up in seconds. No credit card required. Set up your shop profile and invite your team."
  },
  {
    id: 2,
    icon: Database,
    title: "Add Logic",
    desc: "Import your inventory and start recording transactions. Our simple interface makes data entry a breeze."
  },
  {
    id: 3,
    icon: TrendingUp,
    title: "Get Insights",
    desc: "Watch as ShopSync turns your daily data into actionable insights. Track profits, stock levels, and more."
  }
]

export default function HowItWorks() {
  return (
    <section className="py-24 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="text-primary font-semibold tracking-wider uppercase text-sm">Simple Process</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-2 mb-4">
            How ShopSync Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get up and running in minutes. We've stripped away the complexity so you can focus on selling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border -z-0" />

          {STEPS.map((step, idx) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-center mb-8 transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-lg group-hover:border-primary/50">
                <step.icon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed px-4">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

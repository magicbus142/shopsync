import React from 'react'
import { Check, Sparkles, Store } from 'lucide-react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Free Experience',
    price: '₹0',
    description: 'Perfect for exploring ShopSync',
    features: ['1 User (Owner)', '50 Products Limit', '50 Transactions/month', 'Basic Reports'],
    cta: 'Start for Free',
    highlight: false
  },
  {
    name: 'Smart Shop',
    price: '₹299',
    description: 'Unlock unlimited growth',
    features: ['3 Users (Owner + Staff)', 'Unlimited Products', 'Unlimited Transactions', 'Staff Salary Management', 'PDF Invoice Download', 'Priority Support'],
    cta: 'Upgrade to Smart',
    highlight: true
  }
]

export default function Pricing() {
  return (
    <section className="py-24 bg-secondary/20 relative overflow-hidden" id="pricing">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4">
             <Sparkles className="w-3 h-3 mr-1" /> Flexible Plans
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">Pricing for every stage</h2>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade when you grow. No hidden costs.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative rounded-[2rem] p-8 md:p-10 transition-all duration-300 ${
                plan.highlight 
                  ? 'bg-card border-2 border-blue-500 shadow-2xl scale-105 z-10' 
                  : 'bg-card/50 border border-border shadow-lg hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Store className="w-4 h-4" /> Best Value
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={`text-2xl font-bold mb-2 ${plan.highlight ? 'text-blue-600' : 'text-foreground'}`}>
                    {plan.name}
                </h3>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-extrabold tracking-tight ${plan.highlight ? 'text-foreground' : 'text-foreground/80'}`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground font-medium">/month</span>
                </div>
              </div>

              {/* Separator */}
              <div className="h-px bg-border w-full mb-8" />

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1 rounded-full flex-shrink-0 ${plan.highlight ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link 
                to="/signup"
                className={`w-full block text-center py-4 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] ${
                  plan.highlight 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50' 
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        
        {/* Trust Badge */}
        <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                <span>30-day money-back guarantee on paid plans</span>
            </p>
        </div>
      </div>
    </section>
  )
}

function ShieldCheckIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
    )
}

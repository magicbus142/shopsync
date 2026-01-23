import React, { useState } from 'react';
import { PaymentModal } from '../../components/payment/PaymentModal';
import { Check, Sparkles, Zap, Shield } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free Experience',
    price: '₹0',
    description: 'Perfect for getting started',
    features: [
      'Up to 50 Products',
      'Basic Inventory Management',
      'Single User Access',
      'Community Support'
    ],
    cta: 'Current Plan',
    current: true
  },
  {
    id: 'smart_shop',
    name: 'Smart Shop',
    price: '₹499',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Unlimited Products',
      'Advanced Analytics',
      'Priority Support',
      'Team Access (Coming Soon)',
      'Custom Invoices'
    ],
    cta: 'Upgrade Now',
    highlight: true,
    current: false
  }
];

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-12 p-6 md:py-12">
        {/* ... (CONTENT) ... */}
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
           <h1 className="text-4xl font-extrabold tracking-tight">Simple, Transparent Pricing</h1>
           <p className="text-lg text-muted-foreground">
             Start for free, upgrade when you grow. No hidden fees.
           </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
           {PLANS.map((plan) => (
             <div 
               key={plan.id}
               className={`relative p-8 rounded-3xl border flex flex-col ${
                 plan.highlight 
                   ? 'border-primary bg-primary/5 shadow-xl scale-105 z-10' 
                   : 'border-border bg-card shadow-sm hover:border-primary/30'
               } transition-all duration-300`}
             >
                {plan.highlight && (
                   <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Most Popular
                   </div>
                )}

                <div className="mb-8">
                   <h3 className="text-xl font-bold">{plan.name}</h3>
                   <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                   </div>
                   <p className="mt-2 text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <ul className="flex-1 space-y-4 mb-8">
                   {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                         <div className={`mt-0.5 rounded-full p-0.5 ${plan.highlight ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Check className="w-3 h-3" />
                         </div>
                         {feature}
                      </li>
                   ))}
                </ul>

                <button 
                  onClick={() => !plan.current && setSelectedPlan(plan)}
                  disabled={plan.current}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    plan.highlight 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25' 
                      : plan.current 
                        ? 'bg-muted text-muted-foreground cursor-default' 
                        : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                   {plan.cta}
                </button>
             </div>
           ))}
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center pt-8 border-t border-border">
            <div className="space-y-2">
                <Shield className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Secure Payments</p>
            </div>
            <div className="space-y-2">
                <Zap className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Instant Activation</p>
            </div>
             <div className="space-y-2">
                <Check className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Cancel Anytime</p>
            </div>
             <div className="space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Money Back Guarantee</p>
            </div>
        </div>

      </div>

      <PaymentModal 
        isOpen={!!selectedPlan} 
        onClose={() => setSelectedPlan(null)} 
        plan={selectedPlan}
      />
    </>
  );
}

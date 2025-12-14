import React from 'react'
import { BarChart3, Package, Users, ShieldCheck, Zap, Sparkles, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FeaturesBento() {
  return (
    <section className="py-24 bg-background text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Everything you need. <br />
            <span className="text-muted-foreground">All in one place.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* Card 1: Smart Transactions (Large Square) */}
          <div className="col-span-1 md:col-span-2 md:row-span-2 bg-card border border-border rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="z-10">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-medium mb-2">Smart Transactions</h3>
              <p className="text-muted-foreground max-w-sm">
                Record daily sales, expenses, and payments with just a few taps.
              </p>
            </div>
            {/* Visual: Mock Chart */}
            <div className="mt-8 relative h-48 w-full">
               <div className="absolute inset-x-0 bottom-0 top-10 bg-gradient-to-t from-blue-500/10 to-transparent rounded-t-xl border-t border-blue-500/20"></div>
               <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-between gap-2 px-4 pb-0">
                  {[40, 70, 50, 90, 60, 80, 50].map((h, i) => (
                      <div key={i} className="w-full bg-blue-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
                  ))}
               </div>
            </div>
          </div>

          {/* Card 2: AI Advisor (Tall) */}
          <div className="col-span-1 md:row-span-2 bg-card border border-border rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl transition-all relative overflow-hidden">
            <div className="z-10">
               <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-medium mb-2">AI Advisor</h3>
              <p className="text-muted-foreground text-sm">
                &quot;How&apos;s my profit this month?&quot;
              </p>
            </div>
            
            {/* Visual: Chat Bubbles */}
             <div className="mt-8 space-y-3">
                <div className="bg-muted rounded-2xl rounded-tl-none p-3 text-xs text-foreground max-w-[90%]">
                    Your profit is up 12% vs last week! 🚀
                </div>
                 <div className="bg-blue-600/20 rounded-2xl rounded-tr-none p-3 text-xs text-foreground  ml-auto max-w-[80%]">
                    What about expenses?
                </div>
                 <div className="bg-muted rounded-2xl rounded-tl-none p-3 text-xs text-foreground max-w-[90%]">
                    Expenses remain steady.
                </div>
             </div>
          </div>

          {/* Card 3: Inventory (Small) */}
          <div className="col-span-1 bg-card border border-border rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all group">
            <Package className="w-8 h-8 text-orange-400 mb-4" />
            <div>
                 <h3 className="text-lg font-medium">Inventory</h3>
                 <p className="text-muted-foreground text-sm mt-1">Real-time usage tracking.</p>
            </div>
          </div>

          {/* Card 4: Reports (Small) */}
          <div className="col-span-1 bg-card border border-border rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all">
            <Zap className="w-8 h-8 text-yellow-400 mb-4" />
             <div>
                 <h3 className="text-lg font-medium">Instant Reports</h3>
                 <p className="text-muted-foreground text-sm mt-1">Export to Excel in seconds.</p>
            </div>
          </div>

          {/* Card 5: Team (Wide) */}
          <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-3xl p-8 flex flex-row items-center justify-between hover:shadow-xl transition-all">
             <div className="max-w-[60%]">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-medium mb-1">Team Access</h3>
                <p className="text-muted-foreground text-sm">Manage roles and permissions seamlessly.</p>
             </div>
             {/* Visual: Avatars */}
             <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                        U{i}
                    </div>
                ))}
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">+</div>
             </div>
          </div>

          {/* Card 6: Security (Wide) */}
          <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-3xl p-1 overflow-hidden relative group">
             <div className="h-full bg-gradient-to-br from-card to-background rounded-[20px] p-8 flex flex-col justify-center items-center text-center relative z-10">
                <ShieldCheck className="w-12 h-12 text-teal-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">Enterprise Security</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                    Your data is encrypted and backed up daily. 
                    Safe, secure, and always accessible.
                </p>
             </div>
          </div>

        </div>
        
        <div className="mt-16 text-center">
             <Link to="/signup" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                See all features <ArrowRight className="w-4 h-4"/>
             </Link>
        </div>
      </div>
    </section>
  )
}

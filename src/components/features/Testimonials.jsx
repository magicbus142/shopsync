import React from 'react'
import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    id: 1,
    name: "Rajesh Kumar",
    role: "Grocery Store Owner",
    content: "ShopSync changed how I manage my daily inventory. I used to spend hours counting stock, now it takes minutes. The insights help me stock what actually sells.",
    stars: 5
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    role: "Boutique Manager",
    content: "The interface is so beautiful and easy to use. My staff picked it up in one day. The transaction tracking is a lifesaver for tax season.",
    stars: 5
  },
  {
    id: 3,
    name: "Amit Patel",
    role: "Hardware Shop Owner",
    content: "Finally, software that doesn't feel like it's from the 90s. It runs smooth, looks great, and the mobile view lets me check sales from home.",
    stars: 4
  }
]

export default function Testimonials() {
  return (
    <section className="py-24 bg-secondary/5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Trusted by Small Businesses
          </h2>
          <p className="text-lg text-muted-foreground">
            Don't just take our word for it. See what shop owners differenciate about their experience with ShopSync.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div key={t.id} className="bg-card p-8 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-all duration-300 relative group">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < t.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>

              <p className="text-foreground/80 mb-6 leading-relaxed">
                "{t.content}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{t.name}</h4>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

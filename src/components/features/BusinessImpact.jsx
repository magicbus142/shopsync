import React from 'react'
import { motion } from 'framer-motion'
import { Box, Users, FileText, TrendingUp, Shield, Zap } from 'lucide-react'

const IMPACTS = [
  {
    icon: Box,
    title: "Inventory Mastery",
    desc: "Real-time tracking that eliminates stockouts and reduces waste. Keep your shelves optimized and your customers happy.",
    color: "bg-blue-500/10 text-blue-500"
  },
  {
    icon: Users,
    title: "Worker Engagement",
    desc: "Automated attendance and performance tracking. Create a transparent environment that rewards hard work and consistency.",
    color: "bg-purple-500/10 text-purple-500"
  },
  {
    icon: FileText,
    title: "Invoicing Precision",
    desc: "Professional invoice generation in seconds. Get paid faster and maintain perfect financial records effortlessly.",
    color: "bg-emerald-500/10 text-emerald-500"
  },
  {
    icon: TrendingUp,
    title: "Data-Driven Growth",
    desc: "Identify trends before they happen. Scale your business with confidence based on hard data, not just intuition.",
    color: "bg-orange-500/10 text-orange-500"
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    desc: "Your data is encrypted and secure. Focus on your business while we handle the safety of your sensitive information.",
    color: "bg-pink-500/10 text-pink-500"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Optimized for speed. Access your dashboard from any device, anywhere, with zero lag and maximum efficiency.",
    color: "bg-yellow-500/10 text-yellow-500"
  }
]

export default function BusinessImpact() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  return (
    <section className="py-24 bg-card/30 relative overflow-hidden">
      {/* Decorative Blur Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.span 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-bold tracking-widest uppercase text-xs"
          >
            Business Acceleration
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-foreground mt-4 mb-6 tracking-tight"
          >
            How ShopSync Empowers Your Business
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-3xl mx-auto font-medium"
          >
            We don't just track data; we transform your operations. Discover the tangible impact ShopSync brings to your daily business life.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {IMPACTS.map((impact, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl ${impact.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <impact.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">{impact.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">
                {impact.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

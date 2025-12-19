import React, { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react'

export default function DashboardPreview() {
  const containerRef = useRef(null)
  
  useGSAP(() => {
    // Initial entrance animation
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    tl.from('.dashboard-card', {
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1
    })
    .from('.chart-bar', {
      scaleY: 0,
      transformOrigin: 'bottom',
      duration: 1,
      stagger: 0.05,
      ease: 'elastic.out(1, 0.8)'
    }, '-=0.5')
    // Animate stats with proxy object to avoid NaN
    const stats = gsap.utils.toArray('.stat-value')
    stats.forEach((stat, index) => {
      const originalValue = parseInt(stat.textContent.replace(/,/g, ''), 10)
      const prefix = stat.dataset.prefix || ''
      const counter = { val: 0 }
      
      tl.to(counter, {
        val: originalValue,
        duration: 1.5,
        ease: 'power3.out',
        onUpdate: () => {
          stat.innerText = prefix + Math.ceil(counter.val).toLocaleString()
        }
      }, index === 0 ? '-=0.5' : '<0.1') // Stagger using position parameter
    })

    // Floating animation
    gsap.to(containerRef.current, {
      y: -10,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })

    // Tilt effect on mouse move
    const handleMouseMove = (e) => {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - left) / width - 0.5
      const y = (e.clientY - top) / height - 0.5
      
      gsap.to(containerRef.current, {
        rotationY: x * 10,
        rotationX: -y * 10,
        duration: 0.5,
        ease: 'power2.out'
      })
    }

    const handleMouseLeave = () => {
      gsap.to(containerRef.current, {
        rotationY: 0,
        rotationX: 0,
        duration: 0.5,
        ease: 'power2.out'
      })
    }

    window.addEventListener('mousemove', handleMouseMove) // Ideally scope this or put listener on container if full screen
    // For this specific contained component, we might want to attach to the container itself if it's large enough, 
    // or keep it global if the effect is subtle. Let's attach to container for performance.
    
    const card = containerRef.current
    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
        card.removeEventListener('mousemove', handleMouseMove)
        card.removeEventListener('mouseleave', handleMouseLeave)
    }

  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto perspective-1000">
      <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden transform-style-3d bg-white/50 backdrop-blur-sm dark:bg-black/50">
        {/* Header Mockup */}
        <div className="border-b border-border p-4 flex items-center justify-between bg-muted/30">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="h-2 w-32 bg-border/50 rounded-full"></div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stat Cards */}
          <div className="dashboard-card p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
             <div className="flex items-center gap-3 mb-2 text-primary">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Total Revenue</span>
             </div>
             <div className="text-2xl font-bold stat-value" data-prefix="$">24500</div>
             <div className="text-xs text-muted-foreground mt-1">+12% from last month</div>
          </div>

          <div className="dashboard-card p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/10">
             <div className="flex items-center gap-3 mb-2 text-secondary">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium text-black">Active Users</span>
             </div>
             <div className="text-2xl font-bold stat-value">1240</div>
             <div className="text-xs text-muted-foreground mt-1">+18% new users</div>
          </div>

           <div className="dashboard-card p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10">
             <div className="flex items-center gap-3 mb-2 text-accent">
                <Activity className="w-5 h-5" />
                <span className="text-sm font-medium text-black">Sales Rate</span>
             </div>
             <div className="text-2xl font-bold stat-value" data-prefix="">98</div>
             <div className="text-xs text-muted-foreground mt-1">Orders per hour</div>
          </div>

          {/* Main Chart Area */}
          <div className="dashboard-card md:col-span-2 p-4 rounded-xl bg-card border border-border min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-sm">Revenue Overview</h3>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                {[65, 40, 75, 55, 80, 45, 90].map((h, i) => (
                    <div 
                        key={i} 
                        className="chart-bar w-full bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors cursor-pointer relative group"
                        style={{ height: `${h}%` }}
                    >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            ${h}k
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="dashboard-card p-4 rounded-xl bg-card border border-border">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Recent Activity
            </h3>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold ring-1 ring-border">
                            U{i}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">New order received</p>
                            <p className="text-xs text-muted-foreground">2 mins ago</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

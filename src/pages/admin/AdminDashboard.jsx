import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Building2, 
  Users, 
  ShoppingBag, 
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Search,
  Database,
  MoreVertical
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { format, formatDistanceToNow } from 'date-fns'
import { AdminCharts } from './AdminCharts'
import { AdminShopDetails } from './AdminShopDetails'

// ... existing imports

export default function AdminDashboard() {
  const [stats, setStats] = useState([])
  const [selectedShop, setSelectedShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPlatformStats()
  }, [])
  
// ... (keep existing functions)

  const fetchPlatformStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_stats')
      
      if (error) throw error
      setStats(data || [])
    } catch (err) {
      console.error('Admin Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePlan = async (orgId, newPlan) => {
     try {
        const { error } = await supabase.rpc('update_organization_plan', {
           target_org_id: orgId,
           new_plan_key: newPlan
        })
        if (error) throw error
        
        // Optimistic update or refetch
        setStats(prev => prev.map(org => 
           org.org_id === orgId ? { ...org, plan_key: newPlan } : org
        ))
     } catch (err) {
        console.error('Update Error:', err)
        alert('Failed to update plan: ' + err.message)
     }
  }

  const formatBytes = (bytes, decimals = 2) => {
      if (!+bytes) return '0 Bytes'
      const k = 1024
      const dm = decimals < 0 ? 0 : decimals
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  // Derived Metrics
  const totalShops = stats.length
  const totalProducts = stats.reduce((acc, curr) => acc + (parseInt(curr.product_count) || 0), 0)
  const totalTransactions = stats.reduce((acc, curr) => acc + (parseInt(curr.transaction_count) || 0), 0)
  
  // Filter
  const filteredStats = stats.filter(s => 
    s.org_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
     return (
        <DashboardLayout>
           <div className="h-[60vh] flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
           </div>
        </DashboardLayout>
     )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
           <ShieldAlert className="w-16 h-16 text-destructive/50" />
           <div>
             <h3 className="text-xl font-bold">Access Denied</h3>
             <p className="text-muted-foreground max-w-md mx-auto mt-2">
               {error.includes('Access Denied') 
                 ? "You are not authorized to view the Platform Admin Dashboard."
                 : error}
             </p>
           </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
             <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
             <p className="text-muted-foreground mt-1">Monitor all shops and usage data.</p>
           </div>
           
           <div className="bg-card border border-border rounded-lg p-1.5 flex items-center gap-2 w-full md:w-64">
              <Search className="w-4 h-4 text-muted-foreground ml-2" />
              <input 
                type="text" 
                placeholder="Search shops..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
              />
           </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                   <Building2 className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Total Shops</p>
                   <h3 className="text-2xl font-bold">{totalShops}</h3>
                </div>
            </div>
            
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                   <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Total Products Tracked</p>
                   <h3 className="text-2xl font-bold">{totalProducts.toLocaleString()}</h3>
                </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                   <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                   <h3 className="text-2xl font-bold">{totalTransactions.toLocaleString()}</h3>
                </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                   <Database className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Total Data usage</p>
                   <h3 className="text-2xl font-bold">{formatBytes(stats.reduce((acc, curr) => acc + (parseInt(curr.usage_bytes) || 0), 0))}</h3>
                </div>
            </div>
        </div>

        {/* Visual Analytics */}
        <AdminCharts stats={stats} />

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
           <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold flex items-center gap-2">
                 <Users className="w-5 h-5 text-primary" /> Active Organizations
              </h3>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-muted/50 border-b border-border">
                 <tr>
                   <th className="p-4 font-semibold text-muted-foreground">Shop Details</th>
                   <th className="p-4 font-semibold text-muted-foreground">Plan</th>
                   <th className="p-4 font-semibold text-muted-foreground text-center">Usage (Products)</th>
                   <th className="p-4 font-semibold text-muted-foreground text-center">Usage (Txns)</th>
                   <th className="p-4 font-semibold text-muted-foreground text-center">Data Size</th>
                   <th className="p-4 font-semibold text-muted-foreground">Last Active</th>
                   <th className="p-4 font-semibold text-muted-foreground">Joined At</th>
                   <th className="p-4 font-semibold text-muted-foreground text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {filteredStats.map((org) => (
                   <tr key={org.org_id} className="hover:bg-muted/20 transition-colors">
                     <td className="p-4">
                        <div>
                          <p className="font-bold text-foreground">{org.org_name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{org.owner_email}</p>
                        </div>
                     </td>
                     <td className="p-4">
                        <select 
                          value={org.plan_key}
                          onChange={(e) => handleUpdatePlan(org.org_id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-none outline-none cursor-pointer transition-colors ${
                            org.plan_key === 'free' 
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}
                        >
                           <option value="free">Free Experience</option>
                           <option value="smart_shop">Smart Shop</option>
                        </select>
                     </td>
                     <td className="p-4 text-center">
                        <span className={`font-mono font-medium ${org.product_count > 50 && org.plan_key === 'free' ? 'text-red-500' : ''}`}>
                          {org.product_count}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          / {org.plan_key === 'free' ? '50' : '∞'}
                        </span>
                     </td>
                     <td className="p-4 text-center">
                        <span className="font-mono font-medium">
                          {org.transaction_count}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          / {org.plan_key === 'free' ? '50' : '∞'}
                        </span>
                     </td>
                     <td className="p-4 text-center">
                        <span className="font-mono font-medium text-muted-foreground">
                          {formatBytes(org.usage_bytes)}
                        </span>
                     </td>
                     <td className="p-4">
                        {org.last_active_at ? (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {formatDistanceToNow(new Date(org.last_active_at), { addSuffix: true })}
                            </span>
                        ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                        )}
                     </td>
                     <td className="p-4 text-muted-foreground text-xs">
                        {format(new Date(org.created_at), 'dd MMM yyyy')}
                     </td>
                     <td className="p-4 text-right">
                        <button 
                            onClick={() => setSelectedShop(org)}
                            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                        >
                           <MoreVertical className="w-4 h-4" />
                        </button>
                     </td>
                   </tr>
                 ))}
                 
                 {filteredStats.length === 0 && (
                    <tr>
                       <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No shops found matching your search.
                       </td>
                    </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
      
      {/* Shop Details Drawer */}
      <AdminShopDetails 
        shop={selectedShop} 
        isOpen={!!selectedShop} 
        onClose={() => setSelectedShop(null)} 
        onUpdatePlan={handleUpdatePlan}
      />
    </DashboardLayout>
  )
}

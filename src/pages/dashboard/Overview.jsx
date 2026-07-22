import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet, Package, Users, Clock, AlertCircle, CheckCircle, Briefcase } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Link } from 'react-router-dom'
import DateRangePicker from '../../components/ui/DateRangePicker'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function Overview() {
  const { currentOrg, loading: orgLoading } = useOrganization() // 1. Use Context
  const [dataLoading, setDataLoading] = useState(true)
  const loading = orgLoading || (currentOrg && dataLoading)
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    chartData: [],
    pieData: [],
    inventoryBarData: [],
    workerBarData: [],
    inventoryCount: 0,
    workersCount: 0,
    pendingPayments: [],
    productPerformanceData: []
  })
  
  // Date Filter State
  const [filterType, setFilterType] = useState('month')
  const [dateRange, setDateRange] = useState({ 
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  const handleFilterChange = (type) => {
    setFilterType(type)
    const now = new Date()
    let from, to

    switch(type) {
      case 'today':
          from = format(now, 'yyyy-MM-dd')
          to = format(now, 'yyyy-MM-dd')
          break;
      case 'week':
          from = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') // Monday start
          to = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          break;
      case 'month':
          from = format(startOfMonth(now), 'yyyy-MM-dd')
          to = format(endOfMonth(now), 'yyyy-MM-dd')
          break;
      case 'last_month':
          const lastMonth = subMonths(now, 1)
          from = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
          to = format(endOfMonth(lastMonth), 'yyyy-MM-dd')
          break;
      case 'custom':
          // Keep current range or reset? Letting user pick is better.
          return;
      default:
          return;
    }
    setDateRange({ from, to })
  }

  useEffect(() => {
    if (currentOrg) fetchData()
  }, [dateRange, currentOrg])

  const fetchData = async () => {
    if (!currentOrg) return;
    setDataLoading(true)
    
    try {
        // Build queries
        let txQuery = supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('date', { ascending: true })
        
        if (dateRange.from && dateRange.to) {
           txQuery = txQuery.gte('date', dateRange.from).lte('date', dateRange.to)
        }

        const productsQuery = supabase
          .from('products')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('stock', { ascending: true })

        const workersQuery = supabase
          .from('workers')
          .select('*')
          .eq('organization_id', currentOrg.id)

        const pendingQuery = supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', currentOrg.id) 
          .or('payment_status.eq.Pending,payment_status.eq.Partial,payment_status.eq.pending,payment_status.eq.partial')
          .order('date', { ascending: true })

        // Fetch all 4 independent queries CONCURRENTLY in a single parallel burst
        const [
          { data: transactions, error },
          { data: products },
          { data: workers },
          { data: pendingT }
        ] = await Promise.all([
          txQuery,
          productsQuery,
          workersQuery,
          pendingQuery
        ])

        if (error) { console.error(error); return }

        // Compute totalReceivables & totalPayables from pendingT
        let totalReceivables = 0 // Income Pending (Customers owe us)
        let totalPayables = 0;    // Expense Pending (We owe dealers)
    
        (pendingT || []).forEach(t => {
            const amount = Number(t.amount) || 0
            const paid = Number(t.amount_paid) || 0
            const pending = Math.max(0, amount - paid)
            
            if (t.type === 'income') {
                totalReceivables += pending
            } else {
                totalPayables += pending
            }
        })
    
        // 4. Process KPI Data & Product Revenue
        const safeTx = transactions || []
        const totalIncome = safeTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
        const totalExpenses = safeTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
        const netProfit = totalIncome - totalExpenses
    
        // --- Product Performance (Margins) Calculation ---
        const productStats = {} // { [pid]: { revenue: 0, qty: 0, lastSold: 'YYYY-MM-DD' } }
        const txnIds = safeTx.map(t => t.id)
        
        // A. Legacy/Single Product Transactions
        safeTx.forEach(t => {
            if (t.type === 'income' && t.product_id) {
                 const current = productStats[t.product_id] || { revenue: 0, qty: 0, lastSold: null }
                 current.revenue += Number(t.amount)
                 current.qty += 1
                 // Tx sorted by date asc, so just overwriting keeps the latest
                 current.lastSold = t.date 
                 productStats[t.product_id] = current
            }
        })
    
        // B. Multi-item Transactions
        if (txnIds.length > 0) {
            const { data: items } = await supabase
                .from('transaction_items')
                .select('*')
                .in('transaction_id', txnIds)
            
            if (items) {
                items.forEach(item => {
                    const parent = safeTx.find(t => t.id === item.transaction_id)
                    if (parent && parent.type === 'income') {
                         const current = productStats[item.product_id] || { revenue: 0, qty: 0, lastSold: null }
                         current.revenue += Number(item.total_price)
                         current.qty += Number(item.quantity)
                         
                         // Update lastSold if this tx is newer or same (relying on sort order of parent array)
                         // Parent txs are sorted, so we can trust current.lastSold update logic if we process in order.
                         // items processing might not be in order relative to parents? 
                         // Better safe:
                         if (!current.lastSold || new Date(parent.date) > new Date(current.lastSold)) {
                             current.lastSold = parent.date
                         }

                         productStats[item.product_id] = current
                    }
                })
            }
        }
    
        const productPerformanceData = Object.keys(productStats).map(pid => {
             const product = (products || []).find(p => p.id === pid)
             if (!product) return null
             
             const stats = productStats[pid]
             const buyingPrice = Number(product.buying_price) || 0
             const cost = stats.qty * buyingPrice
             const margin = stats.revenue - cost
             const marginPercent = stats.revenue > 0 ? (margin / stats.revenue) * 100 : 0
             
             return {
                 id: pid,
                 name: product.name,
                 revenue: stats.revenue,
                 qty: stats.qty,
                 buyingPrice,
                 cost,
                 margin,
                 marginPercent,
                 lastSold: stats.lastSold
             }
        })
        .filter(Boolean)
        .sort((a, b) => b.margin - a.margin) // Sort by Margin
        // .slice(0, 5) // Removed limit for scrollable table
        
        // Reuse for Chart (Top 5 revenue)
        const productRevenueData = productPerformanceData
            .map(p => ({ name: p.name, revenue: p.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
        // -----------------------------------
    
        // 5. Process Income Trend (Area Chart)
        const start = parseISO(dateRange.from)
        const end = parseISO(dateRange.to)
        // Handle case where range is invalid or empty
        const daysInterval = (start && end && !isNaN(start) && !isNaN(end)) ? eachDayOfInterval({ start, end }) : []
    
        const chartData = daysInterval.map(date => {
           const dateStr = format(date, 'yyyy-MM-dd')
           const dayTransactions = safeTx.filter(t => t.date === dateStr && t.type === 'income')
           const dailyTotal = dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
           return {
              name: format(date, 'dd MMM'),
              sales: dailyTotal,
              fullDate: dateStr
           }
        })
    
        // 6. Process Expense Breakdown (Pie Chart)
        const expenseTransactions = safeTx.filter(t => t.type === 'expense')
        const categoryTotals = {}
        expenseTransactions.forEach(t => {
           const cat = t.category || 'Other'
           categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount)
        })
    
        const pieData = Object.keys(categoryTotals).map(cat => ({
           name: cat,
           value: categoryTotals[cat]
        })).filter(d => d.value > 0)
    
        // 7. Process Inventory Bar Data (Top 5 Lowest Stock)
        const inventoryBarData = (products || [])
           .slice(0, 5) // Products are already ordered by stock ascending
           .map(p => ({
              name: p.name,
              stock: p.stock,
              initial: p.initial_stock || 0
           }))
    
        // 8. Process Worker Bar Data (Top 5 Paid in Period)
        const workerBarData = (workers || []).map(w => {
           const totalPaid = safeTx
              .filter(t => t.worker_id === w.id && t.type === 'expense')
              .reduce((sum, t) => sum + Number(t.amount), 0)
           return { name: w.name, paid: totalPaid }
        })
        .sort((a, b) => b.paid - a.paid) // Sort by highest paid
        .slice(0, 5)
        .filter(w => w.paid > 0)
    
        setData({
          totalIncome,
          totalExpenses,
          netProfit,
          totalReceivables,
          totalPayables,
          chartData,
          pieData,
          inventoryBarData,
          workerBarData,
          productRevenueData, 
          productPerformanceData,
          inventoryCount: (products || []).length,
          workersCount: (workers || []).length,
          pendingPayments: pendingT || []
        })

    } catch (err) {
        console.error("Dashboard Fetch Error:", err)
    } finally {
        setDataLoading(false)
    }
    setDataLoading(false)
  }

  if (!loading && !currentOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <h2 className="text-2xl font-bold mb-2">No Organization Found</h2>
        <p className="text-muted-foreground mb-4">You generally shouldn't see this. Try refreshing or contacting support.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Refresh Page
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">Overview of your business performance.</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="bg-muted/40 p-1 rounded-xl flex gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  filterType === filter.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filterType === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border p-1.5 rounded-xl shadow-sm w-full sm:w-auto"
            >
              <DateRangePicker 
                  from={dateRange.from}
                  to={dateRange.to}
                  onFromChange={(val) => setDateRange({...dateRange, from: val})}
                  onToChange={(val) => setDateRange({...dateRange, to: val})}
              />
            </motion.div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground">Loading Dashboard Data...</div>
      ) : (
        <>
            {/* ── Hero Financial Cards (Light Colors) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {/* Income */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-800/30 p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Income</p>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl"><TrendingUp className="w-4 h-4"/></div>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-100">₹{data.totalIncome.toLocaleString()}</h3>
                </div>

                {/* Expenses */}
                <div className="relative overflow-hidden rounded-2xl border border-rose-200/70 bg-rose-50/80 dark:bg-rose-950/20 dark:border-rose-800/30 p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Total Expenses</p>
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl"><TrendingDown className="w-4 h-4"/></div>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight text-rose-950 dark:text-rose-100">₹{data.totalExpenses.toLocaleString()}</h3>
                </div>

                {/* Net Profit */}
                <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
                    data.netProfit >= 0 
                      ? 'border-blue-200/70 bg-blue-50/80 dark:bg-blue-950/20 dark:border-blue-800/30' 
                      : 'border-red-200/70 bg-red-50/80 dark:bg-red-950/20 dark:border-red-800/30'
                }`}>
                    <div className="flex justify-between items-start mb-3">
                        <p className={`text-xs font-bold uppercase tracking-wider ${data.netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>Net Profit</p>
                        <div className={`p-2 rounded-xl ${data.netProfit >= 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                            <Wallet className="w-4 h-4"/>
                        </div>
                    </div>
                    <h3 className={`text-3xl font-extrabold tracking-tight ${data.netProfit >= 0 ? 'text-blue-950 dark:text-blue-100' : 'text-red-950 dark:text-red-100'}`}>₹{data.netProfit.toLocaleString()}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Before Taxes</p>
                </div>
            </div>

            {/* ── Secondary Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                 {/* Receivables */}
                 <div className="relative overflow-hidden rounded-2xl border border-orange-200/50 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800/20 p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Receivables</p>
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><Clock className="w-4 h-4"/></div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-orange-700 dark:text-orange-300">₹{(data.totalReceivables || 0).toLocaleString()}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Pending from Customers</p>
                 </div>

                 {/* Payables */}
                 <div className="relative overflow-hidden rounded-2xl border border-rose-200/50 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800/20 p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Payables</p>
                        <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg"><Briefcase className="w-4 h-4"/></div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">₹{(data.totalPayables || 0).toLocaleString()}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Pending to Dealers</p>
                 </div>

                {/* Inventory Link */}
                <Link to="/dashboard/inventory" className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800/20 p-4 shadow-sm hover:shadow-md transition-all group block">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Inventory</p>
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><Package className="w-4 h-4"/></div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">{data.inventoryCount}</h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">View Stock →</p>
                </Link>

                {/* Workers Link */}
                <Link to="/dashboard/workers" className="relative overflow-hidden rounded-2xl border border-violet-200/50 bg-violet-50 dark:bg-violet-900/10 dark:border-violet-800/20 p-4 shadow-sm hover:shadow-md transition-all group block">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Staff</p>
                        <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-lg"><Users className="w-4 h-4"/></div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-violet-700 dark:text-violet-300">{data.workersCount}</h3>
                    <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-1">Manage Team →</p>
                </Link>
            </div>

            {/* ── Charts Row 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-5">
                {/* Area Chart */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[300px] sm:h-[380px]">
                    <h3 className="text-base font-semibold mb-4 flex items-center justify-between">
                        <span>Income Trend</span>
                        <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded-full">{data.chartData.length} Days</span>
                    </h3>
                    <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={data.chartData}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-muted-foreground)" opacity={0.1} />
                        <XAxis 
                            dataKey="name" 
                            stroke="var(--color-muted-foreground)" 
                            axisLine={false} 
                            tickLine={false}
                            minTickGap={30}
                            fontSize={11}
                        />
                        <YAxis stroke="var(--color-muted-foreground)" axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} fontSize={11} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="var(--color-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[300px] sm:h-[380px]">
                    <h3 className="text-base font-semibold mb-4">Expense Breakdown</h3>
                    {data.pieData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No expenses in this period.</div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height="70%">
                                <PieChart>
                                <Pie
                                    data={data.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                    formatter={(value) => `₹${value}`}
                                />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-3 mt-2 flex-wrap max-h-16 overflow-y-auto">
                                {data.pieData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                                </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Charts Row 2 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-5">
                {/* Inventory Bar Chart */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[300px] sm:h-[380px]">
                    <h3 className="text-base font-semibold mb-4">Products Stock</h3>
                    {data.inventoryBarData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No products found.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                           <BarChart data={data.inventoryBarData} layout="vertical" margin={{ right: 30 }}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-secondary)" opacity={0.2} />
                               <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                               <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={90} 
                                  stroke="var(--color-muted-foreground)" 
                                  axisLine={false} 
                                  tickLine={false}
                                  fontSize={11}
                               />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                  cursor={{fill: 'transparent'}}
                               />
                               <Bar dataKey="initial" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} name="Initial Stock" />
                               <Bar dataKey="stock" fill="#F97316" radius={[0, 4, 4, 0]} barSize={16} name="Current Stock">
                                   <LabelList dataKey="stock" position="right" fill="var(--color-foreground)" fontSize={11} />
                               </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Worker Payments Bar Chart */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[300px] sm:h-[380px]">
                    <h3 className="text-base font-semibold mb-4">Highest Paid Staff (Period)</h3>
                     {data.workerBarData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No payment data in this period.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                           <BarChart data={data.workerBarData} margin={{ top: 20 }}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-secondary)" opacity={0.2} />
                               <XAxis 
                                  dataKey="name" 
                                  stroke="var(--color-muted-foreground)" 
                                  axisLine={false} 
                                  tickLine={false}
                                  fontSize={11} 
                               />
                               <YAxis stroke="var(--color-muted-foreground)" axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} fontSize={11} />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                  cursor={{fill: 'transparent'}}
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                               />
                               <Bar dataKey="paid" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={28} name="Total Paid">
                                   <LabelList dataKey="paid" position="top" formatter={(value) => `₹${value}`} fill="var(--color-foreground)" fontSize={11} />
                               </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Bottom Row: Revenue Chart + Pending Payments ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-5">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[300px] sm:h-[380px]">
                    <h3 className="text-base font-semibold mb-4">Top Selling Products (Revenue)</h3>
                     {data.productRevenueData && data.productRevenueData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No sales data in this period.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                           <BarChart data={data.productRevenueData} layout="vertical" margin={{ right: 40 }}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-secondary)" opacity={0.2} />
                               <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                               <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={90} 
                                  stroke="var(--color-muted-foreground)" 
                                  axisLine={false} 
                                  tickLine={false}
                                  fontSize={11}
                               />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                  cursor={{fill: 'transparent'}}
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                               />
                               <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} name="Revenue">
                                   <LabelList dataKey="revenue" position="right" formatter={(value) => `₹${value}`} fill="var(--color-foreground)" fontSize={11} />
                               </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Pending Payments */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                   <div className="flex items-center gap-2 mb-4">
                       <AlertCircle className="w-4 h-4 text-orange-500" />
                       <h3 className="text-base font-semibold">Pending Payments</h3>
                   </div>
                   <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                        {data.pendingPayments.length === 0 ? (
                           <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                               <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
                               <p className="text-sm">All payments settled!</p>
                           </div>
                        ) : (
                           data.pendingPayments.map((t) => {
                               const pendingAmount = Math.max(0, Number(t.amount) - (Number(t.amount_paid) || 0))
                               return (
                                   <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/20">
                                       <div>
                                           <p className="font-semibold text-sm text-foreground">{t.description}</p>
                                           <div className="flex gap-2 mt-1">
                                               <span className="text-[10px] px-2 py-0.5 bg-orange-200/80 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300 rounded-full font-bold">
                                                   {t.payment_status}
                                               </span>
                                               <span className="text-[10px] text-muted-foreground">{format(parseISO(t.date), 'dd MMM')}</span>
                                           </div>
                                       </div>
                                       <div className="text-right">
                                           <p className="font-black text-orange-600 dark:text-orange-400">₹{pendingAmount.toLocaleString()}</p>
                                           <p className="text-[10px] text-muted-foreground">of ₹{Number(t.amount).toLocaleString()}</p>
                                       </div>
                                   </div>
                               )
                           })
                        )}
                   </div>
                </div>
            </div>

            {/* ── Product Performance Table ── */}
            <div className="mb-6">
                 <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center">
                        <h3 className="text-base font-semibold">Product Performance (Margins)</h3>
                        <Link to="/dashboard/inventory" className="text-xs text-primary hover:underline font-medium">View All →</Link>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left min-w-[640px]">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                    <th className="px-4 py-3 text-right">Cost</th>
                                    <th className="px-4 py-3 text-right">Margin</th>
                                    <th className="px-4 py-3 text-right">%</th>
                                    <th className="px-4 py-3 text-right">Last Sold</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.productPerformanceData && data.productPerformanceData.length > 0 ? (
                                    data.productPerformanceData.map((prod) => (
                                        <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-foreground">{prod.name}</td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">{prod.qty}</td>
                                            <td className="px-4 py-3 text-right font-medium">₹{prod.revenue.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">₹{prod.cost.toLocaleString()}</td>
                                            <td className={`px-4 py-3 text-right font-black ${prod.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                ₹{prod.margin.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    prod.marginPercent >= 20 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                                                    prod.marginPercent > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                    {Math.round(prod.marginPercent)}%
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                                {prod.lastSold ? format(parseISO(prod.lastSold), 'dd MMM yy') : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-muted-foreground">
                                            No sales data available for margin calculation.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </div>

        </>
      )}
    </>
  )
}

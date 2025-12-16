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
        // 1. Fetch Transactions
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', currentOrg.id) // Filter by Org
          .order('date', { ascending: true })
        
        // Apply Date Filter to Query (optimization)
        if (dateRange.from && dateRange.to) {
           query = query.gte('date', dateRange.from).lte('date', dateRange.to)
        }
    
        const { data: transactions, error } = await query
        
        // 2. Fetch Products (for Inventory Stats)
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', currentOrg.id) // Filter by Org
          .order('stock', { ascending: true })
    
        // 3. Fetch Workers (for Worker Stats)
        const { data: workers } = await supabase
          .from('workers')
          .select('*')
          .eq('organization_id', currentOrg.id) // Filter by Org
    
        // 4. Fetch Pending (Separate from date filter)
        // A. Top 6 for list
        const { data: pendingT } = await supabase
            .from('transactions')
            .select('*')
            .eq('organization_id', currentOrg.id) 
            .or('payment_status.eq.Pending,payment_status.eq.Partial')
            .order('date', { ascending: true }) 
            .limit(6) 
    
        // B. Total Pending Amount (Fetch all pending to sum)
        const { data: allPending } = await supabase
            .from('transactions')
            .select('amount, amount_paid, type')
            .eq('organization_id', currentOrg.id)
            .or('payment_status.eq.Pending,payment_status.eq.Partial')
        
        let totalReceivables = 0 // Income Pending (Customers owe us)
        let totalPayables = 0;    // Expense Pending (We owe dealers)
    
        (allPending || []).forEach(t => {
            const amount = Number(t.amount) || 0
            const paid = Number(t.amount_paid) || 0
            const pending = Math.max(0, amount - paid)
            
            if (t.type === 'income') {
                totalReceivables += pending
            } else {
                totalPayables += pending
            }
        })
    
        if (error) { console.error(error); return }
    
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
        .slice(0, 5) // Top 5 for charts, verify if table needs more later
        
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
        <div>
           <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
           <p className="text-muted-foreground mt-1">Overview of your business performance.</p>
        </div>
        
        {/* Improved Date Filter UI matched to user friendly design */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
           
           <div className="bg-muted/30 p-1 rounded-xl flex gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                // { id: 'last_month', label: 'Last Month' },
                { id: 'custom', label: 'Custom' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterType === filter.id 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm'
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
               className="bg-card border border-border p-1.5 rounded-xl shadow-sm"
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
            {/* Financial Overview - Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-card dark:border-green-900/20 group">
                    <div className="absolute right-0 top-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-green-500/10 blur-3xl group-hover:bg-green-500/20 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-2">Total Income</p>
                           <h3 className="text-3xl font-bold tracking-tight text-foreground">₹ {data.totalIncome.toLocaleString()}</h3>
                           <div className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded-full">
                             {/* <TrendingUp className="w-3 h-3 mr-1"/> +12% from last month */}
                           </div>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl shadow-sm"><TrendingUp className="w-6 h-6"/></div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-card dark:border-red-900/20 group">
                    <div className="absolute right-0 top-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-red-500/10 blur-3xl group-hover:bg-red-500/20 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-2">Total Expenses</p>
                           <h3 className="text-3xl font-bold tracking-tight text-foreground">₹ {data.totalExpenses.toLocaleString()}</h3>
                           <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 w-fit px-2 py-1 rounded-full">
                             {/* <TrendingDown className="w-3 h-3 mr-1"/> -4% from last month */}
                           </div>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl shadow-sm"><TrendingDown className="w-6 h-6"/></div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-card dark:border-blue-900/20 group">
                    <div className="absolute right-0 top-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-2">Net Profit</p>
                           <h3 className={`text-3xl font-bold tracking-tight ${data.netProfit >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                               ₹ {data.netProfit.toLocaleString()}
                           </h3>
                           <p className="text-xs text-muted-foreground mt-2">Before Taxes</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm"><Wallet className="w-6 h-6"/></div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 {/* Receivables */}
                 <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:bg-card dark:border-orange-900/20 group">
                    <div className="absolute right-0 top-0 h-24 w-24 -mr-6 -mt-6 rounded-full bg-orange-500/10 blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-1">Receivables</p>
                           <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹ {(data.totalReceivables || 0).toLocaleString()}</h3>
                           <p className="text-xs text-muted-foreground mt-1">Pending from Customers</p>
                        </div>
                        <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl"><Clock className="w-5 h-5"/></div>
                    </div>
                </div>

                 {/* Payables */}
                 <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:bg-card dark:border-rose-900/20 group">
                    <div className="absolute right-0 top-0 h-24 w-24 -mr-6 -mt-6 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-1">Payables</p>
                           <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">₹ {(data.totalPayables || 0).toLocaleString()}</h3>
                           <p className="text-xs text-muted-foreground mt-1">Pending to Dealers</p>
                        </div>
                        <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl"><Briefcase className="w-5 h-5"/></div>
                    </div>
                </div>

                {/* Inventory Link */}
                <Link to="/dashboard/inventory" className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-all dark:bg-card group cursor-pointer block">
                    <div className="absolute right-0 top-0 h-24 w-24 -mr-6 -mt-6 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/15 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-1">Inventory Items</p>
                           <h3 className="text-2xl font-bold text-foreground">{data.inventoryCount}</h3>
                           <p className="text-xs text-muted-foreground mt-1 text-emerald-600 dark:text-emerald-400">View Stock →</p>
                        </div>
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><Package className="w-5 h-5"/></div>
                    </div>
                </Link>

                {/* Workers Link */}
                <Link to="/dashboard/workers" className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-all dark:bg-card group cursor-pointer block">
                    <div className="absolute right-0 top-0 h-24 w-24 -mr-6 -mt-6 rounded-full bg-violet-500/5 blur-2xl group-hover:bg-violet-500/15 transition-all"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-muted-foreground mb-1">Total Staff</p>
                           <h3 className="text-2xl font-bold text-foreground">{data.workersCount}</h3>
                           <p className="text-xs text-muted-foreground mt-1 text-violet-600 dark:text-violet-400">Manage Team →</p>
                        </div>
                        <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl"><Users className="w-5 h-5"/></div>
                    </div>
                </Link>
            </div>

            {/* Income & Expense Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Area Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
                        <span>Income Trend</span>
                        <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded-full">{data.chartData.length} Days</span>
                    </h3>
                    <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={data.chartData}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
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
                        />
                        <YAxis stroke="var(--color-muted-foreground)" axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-lg font-semibold mb-6">Expense Breakdown</h3>
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
                                    innerRadius={60}
                                    outerRadius={100}
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
                            <div className="flex justify-center gap-4 mt-4 flex-wrap max-h-20 overflow-y-auto">
                                {data.pieData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-sm text-muted-foreground">{entry.name}</span>
                                </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Inventory & Workers Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Bar Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-lg font-semibold mb-6">Products Stock</h3>
                    {data.inventoryBarData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No products found.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                           <BarChart data={data.inventoryBarData} layout="vertical" margin={{ right: 30 }}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-secondary)" opacity={0.2} />
                               <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                               <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={100} 
                                  stroke="var(--color-muted-foreground)" 
                                  axisLine={false} 
                                  tickLine={false}
                                  fontSize={12}
                               />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                  cursor={{fill: 'transparent'}}
                               />
                               <Bar dataKey="initial" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} name="Initial Stock" />
                               <Bar dataKey="stock" fill="#F97316" radius={[0, 4, 4, 0]} barSize={20} name="Current Stock">
                                   <LabelList dataKey="stock" position="right" fill="var(--color-foreground)" fontSize={12} />
                               </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Worker Payments Bar Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-lg font-semibold mb-6">Highest Paid Staff (Period)</h3>
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
                                  fontSize={12} 
                               />
                               <YAxis stroke="var(--color-muted-foreground)" axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} fontSize={12} />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                  cursor={{fill: 'transparent'}}
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                               />
                               <Bar dataKey="paid" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} name="Total Paid">
                                   <LabelList dataKey="paid" position="top" formatter={(value) => `₹${value}`} fill="var(--color-foreground)" fontSize={12} />
                               </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Product Revenue Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                 <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-lg font-semibold mb-6">Top Selling Products (Revenue)</h3>
                     {data.productRevenueData && data.productRevenueData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No sales data in this period.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                           <BarChart data={data.productRevenueData} layout="vertical" margin={{ right: 40 }}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-secondary)" opacity={0.2} />
                               <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                               <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={100} 
                                  stroke="var(--color-muted-foreground)" 
                                  axisLine={false} 
                                  tickLine={false}
                                  fontSize={12}
                               />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                  cursor={{fill: 'transparent'}}
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                               />
                               <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} barSize={30} name="Revenue">
                                   <LabelList dataKey="revenue" position="right" formatter={(value) => `₹${value}`} fill="var(--color-foreground)" fontSize={12} />
                               </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            {/* Product Performance Table */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                 <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Product Performance (Margins)</h3>
                        <Link to="/dashboard/inventory" className="text-sm text-primary hover:underline">View All Inventory</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3 text-right">Qty Sold</th>
                                    <th className="px-6 py-3 text-right">Revenue</th>
                                    <th className="px-6 py-3 text-right">Est. Cost</th>
                                    <th className="px-6 py-3 text-right">Margin</th>
                                    <th className="px-6 py-3 text-right">Margin %</th>
                                    <th className="px-6 py-3 text-right">Last Sold</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.productPerformanceData && data.productPerformanceData.length > 0 ? (
                                    data.productPerformanceData.map((prod) => (
                                        <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">{prod.name}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">{prod.qty}</td>
                                            <td className="px-6 py-4 text-right">₹{prod.revenue.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">₹{prod.cost.toLocaleString()}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${prod.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹{prod.margin.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    prod.marginPercent >= 20 ? 'bg-green-100 text-green-700' : 
                                                    prod.marginPercent > 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {Math.round(prod.marginPercent)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                                                {prod.lastSold ? format(parseISO(prod.lastSold), 'dd MMM yyyy') : '-'}
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

            {/* Pending Section */}
            <div className="grid grid-cols-1 gap-6 pb-8">
                 {/* Pending Payments */}
                 <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold">Pending Payments</h3>
                    </div>
                    <div className="space-y-3">
                         {data.pendingPayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <CheckCircle className="w-10 h-10 mb-2 opacity-20" />
                                <p>All payments settled!</p>
                            </div>
                         ) : (
                            data.pendingPayments.map((t) => {
                                const pendingAmount = Math.max(0, Number(t.amount) - (Number(t.amount_paid) || 0))
                                return (
                                    <div key={t.id} className="flex items-center justify-between border-b border-border/50 last:border-0 pb-3 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm">{t.description}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                                    {t.payment_status}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{format(parseISO(t.date), 'dd MMM')}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">of ₹{Number(t.amount).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )
                            })
                         )}
                         {data.pendingPayments.length > 0 && (
                             <Link to="/dashboard/transactions?status=Pending" className="block text-center text-sm text-primary hover:underline pt-2">
                                 View All Pending
                             </Link>
                         )}
                    </div>
                 </div>
            </div>
        </div>
        </>
      )}
    </>
  )
}

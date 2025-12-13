import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet, Package, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts'
import { supabase } from '../../lib/supabase'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Link } from 'react-router-dom'
import DateRangePicker from '../../components/ui/DateRangePicker'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function Overview() {
  const [loading, setLoading] = useState(true)
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
    pendingPayments: []
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
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    
    // 1. Fetch Transactions
    let query = supabase.from('transactions').select('*').order('date', { ascending: true })
    
    // Apply Date Filter to Query (optimization)
    if (dateRange.from && dateRange.to) {
       query = query.gte('date', dateRange.from).lte('date', dateRange.to)
    }

    const { data: transactions, error } = await query
    
    // 2. Fetch Products (for Inventory Stats)
    const { data: products } = await supabase.from('products').select('*').order('stock', { ascending: true })

    // 3. Fetch Workers (for Worker Stats)
    const { data: workers } = await supabase.from('workers').select('*')

    // 4. Fetch Pending (Separate from date filter)
    const { data: pendingT } = await supabase
        .from('transactions')
        .select('*')
        .or('payment_status.eq.Pending,payment_status.eq.Partial')
        .order('date', { ascending: true }) // Oldest due first
        .limit(6) // Top 6

    if (error) { console.error(error); setLoading(false); return }

    // 4. Process KPI Data & Product Revenue
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
    const netProfit = totalIncome - totalExpenses

    // --- Product Revenue Calculation ---
    const productRevenueMap = {}
    const txnIds = transactions.map(t => t.id)
    
    // A. Legacy/Single Product Transactions
    transactions.forEach(t => {
        if (t.type === 'income' && t.product_id) {
             productRevenueMap[t.product_id] = (productRevenueMap[t.product_id] || 0) + Number(t.amount)
        }
    })

    // B. Multi-item Transactions (Fetch items for these transactions)
    if (txnIds.length > 0) {
        const { data: items } = await supabase
            .from('transaction_items')
            .select('*')
            .in('transaction_id', txnIds)
        
        if (items) {
            items.forEach(item => {
                // Determine if parent txn is income (it should be if items exist, usually)
                // We rely on the fact we only fetched items for the filtered transactions
                // But we should verify if the item's parent txn is actually INCOME.
                // We can look up the parent in our `transactions` array.
                const parent = transactions.find(t => t.id === item.transaction_id)
                if (parent && parent.type === 'income') {
                     productRevenueMap[item.product_id] = (productRevenueMap[item.product_id] || 0) + Number(item.total_price)
                }
            })
        }
    }

    const productRevenueData = Object.keys(productRevenueMap).map(pid => {
         const product = products.find(p => p.id === pid)
         return {
             name: product ? product.name : 'Unknown',
             revenue: productRevenueMap[pid]
         }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5) // Top 5
    // -----------------------------------

    // 5. Process Income Trend (Area Chart)
    const start = parseISO(dateRange.from)
    const end = parseISO(dateRange.to)
    // Handle case where range is invalid or empty
    const daysInterval = (start && end && !isNaN(start) && !isNaN(end)) ? eachDayOfInterval({ start, end }) : []

    const chartData = daysInterval.map(date => {
       const dateStr = format(date, 'yyyy-MM-dd')
       const dayTransactions = transactions.filter(t => t.date === dateStr && t.type === 'income')
       const dailyTotal = dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
       return {
          name: format(date, 'dd MMM'),
          sales: dailyTotal,
          fullDate: dateStr
       }
    })

    // 6. Process Expense Breakdown (Pie Chart)
    const expenseTransactions = transactions.filter(t => t.type === 'expense')
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
       const totalPaid = transactions
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
      chartData,
      pieData,
      inventoryBarData,
      workerBarData,
      productRevenueData, // Add new data
      inventoryCount: products?.length || 0,
      workersCount: workers?.length || 0,
      pendingPayments: pendingT || []
    })
    setLoading(false)
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
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                           <p className="text-sm text-muted-foreground font-medium mb-1">Total Income</p>
                           <h3 className="text-2xl font-bold">₹ {data.totalIncome.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
                    </div>
                </div>
                
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                           <p className="text-sm text-muted-foreground font-medium mb-1">Total Expenses</p>
                           <h3 className="text-2xl font-bold">₹ {data.totalExpenses.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><TrendingDown className="w-5 h-5"/></div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                           <p className="text-sm text-muted-foreground font-medium mb-1">Net Profit</p>
                           <h3 className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
                               ₹ {data.netProfit.toLocaleString()}
                           </h3>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Wallet className="w-5 h-5"/></div>
                    </div>
                </div>

                <Link to="/dashboard/inventory" className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="flex justify-between items-start">
                        <div>
                           <p className="text-sm text-muted-foreground font-medium mb-1">Inventory</p>
                           <h3 className="text-2xl font-bold">{data.inventoryCount}</h3>
                           {/* Removed text link as requested */}
                        </div>
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg"><Package className="w-5 h-5"/></div>
                    </div>
                </Link>

                <Link to="/dashboard/workers" className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="flex justify-between items-start">
                        <div>
                           <p className="text-sm text-muted-foreground font-medium mb-1">Workers</p>
                           <h3 className="text-2xl font-bold">{data.workersCount}</h3>
                           {/* Removed text link as requested */}
                        </div>
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><Users className="w-5 h-5"/></div>
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

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, X, MessageSquare, Loader2, TrendingUp, IndianRupee, AlertCircle } from 'lucide-react'
import ChatWidget from '../../components/features/ChatWidget'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import { format, subDays, isSameDay, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Reports() {
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [aiInsight, setAiInsight] = useState(null)
  const { currentOrg } = useOrganization()

  useEffect(() => {
    if (currentOrg) fetchData()
  }, [currentOrg])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', currentOrg.id)
      .order('date', { ascending: true }) // Get chronological for charts
    
    setTransactions(data || [])
    setLoading(false)
  }

  // --- Analytics Logic ---
  const incomeTxns = transactions.filter(t => t.type === 'income')
  const totalSales = incomeTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalPending = incomeTxns.reduce((sum, t) => sum + (Number(t.amount || 0) - Number(t.amount_paid || 0)), 0)
  
  // Chart Data: Last 7 Days
  const chartData = []
  for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const dayStr = format(d, 'yyyy-MM-dd')
      const label = format(d, 'EEE') // Mon, Tue...
      
      const dailyTotal = incomeTxns
        .filter(t => t.date === dayStr)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
        
      chartData.push({ name: label, sales: dailyTotal })
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    
    // Simulate AI "Thinking"
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Rule-based "AI" Generation
    const daysWithSales = new Set(incomeTxns.map(t => t.date)).size
    const avgSales = daysWithSales ? Math.round(totalSales / daysWithSales) : 0
    
    let insight = ""
    if (totalSales === 0) {
        insight = "I don't see any sales yet. Record your first transaction to get insights!"
    } else if (totalPending > totalSales * 0.5) {
        insight = `You have done ₹${totalSales.toLocaleString()} in sales, but ₹${totalPending.toLocaleString()} is still pending! You should follow up with your customers to collect payments.`
    } else if (chartData[6].sales > avgSales) {
        insight = `Great job! Your sales today (₹${chartData[6].sales.toLocaleString()}) are higher than your average of ₹${avgSales.toLocaleString()}. Keep it up!`
    } else {
        insight = `Your total sales are ₹${totalSales.toLocaleString()}. You have a healthy cash flow with only ₹${totalPending.toLocaleString()} pending.`
    }

    setAiInsight({
        english_insight: insight,
        // Simple mock translation or fallback
        telugu_insight: "మీ వ్యాపారం గురించి పూర్తి వివరాలు ఇక్కడ ఉన్నాయి. (Translation feature coming soon)" 
    })
    
    setAnalyzing(false)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 relative min-h-[80vh] pb-24"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Intelligence</h2>
          <p className="text-muted-foreground">Smart insights for {currentOrg?.name || 'your shop'}.</p>
        </div>
        <button 
             onClick={handleAnalyze}
             disabled={analyzing || transactions.length === 0}
             className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
             {analyzing ? 'Analyzing Data...' : 'Generate AI Report'}
        </button>
      </div>

      {/* AI Insight Result Card */}
      {aiInsight && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border-l-4 border-l-indigo-500 rounded-r-xl shadow-md p-6 relative overflow-hidden"
        >
             <div className="flex items-start gap-4">
                 <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                   <Sparkles className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">AI Advisor Says:</h3>
                    <p className="text-lg text-foreground leading-relaxed">
                        "{aiInsight.english_insight}"
                    </p>
                 </div>
                 <button onClick={() => setAiInsight(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
             </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                      <IndianRupee className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-3xl font-bold">₹{totalSales.toLocaleString()}</p>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                      <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Pending Collection</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">₹{totalPending.toLocaleString()}</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                      <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Transactions</span>
              </div>
              <p className="text-3xl font-bold">{transactions.length}</p>
          </div>
      </div>

      {/* Chart */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold mb-6">Sales Trend (Last 7 Days)</h3>
          <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} stroke="#888888" />
                  <YAxis fontSize={12} stroke="#888888" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'transparent' }} 
                  />
                  <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* Chat Bot */}
      <ChatWidget transactions={transactions} totalSales={totalSales} totalPending={totalPending} />
    </motion.div>
  )
}

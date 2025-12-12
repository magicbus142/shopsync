import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, X, MessageSquare, Loader2 } from 'lucide-react'
import ChatWidget from '../../components/features/ChatWidget'
import { supabase } from '../../lib/supabase'

export default function Reports() {
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [aiInsight, setAiInsight] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // We need data for the AI to analyze
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*').limit(100).order('date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      // In the React app, we might need a different way to proxy this to an API or use a Cloud Function.
      // For now, we'll keep the fetch call pointing to a placeholder or assume the backend is set up similarly.
      // If there's no backend, we'll mock it or show an alert.
      
      // Mocking for now as the API route is pending migration/setup
      // const res = await fetch('/api/analyze', ... ) 
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      
      // Mock Response
      setAiInsight({
          english_insight: "Based on your recent transactions, your business is stabilized. Sales are improved by 10% compared to last week. Consider restocking top selling items.",
          telugu_insight: "మీ ఇటీవల లావాదేవీల ఆధారంగా, మీ వ్యాపారం స్థిరపడింది. గత వారంతో పోలిస్తే అమ్మకాలు 10% మెరుగుపడ్డాయి."
      })

    } catch (e) {
      console.error(e)
      alert('Failed to get insights. Analysis API needs to be connected.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 relative min-h-[80vh]"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Insights</h2>
          <p className="text-muted-foreground">AI-powered analytics for your business.</p>
        </div>
        <button 
             onClick={handleAnalyze}
             disabled={analyzing || transactions.length === 0}
             className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
             {analyzing ? 'Analyzing...' : 'Ask AI Advisor'}
        </button>
      </div>

      {/* AI Insight Result */}
      {aiInsight && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-6 relative overflow-hidden shadow-sm"
        >
          <div className="flex items-start gap-4 z-10 relative">
             <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-full text-purple-600 dark:text-purple-300">
               <Sparkles className="w-6 h-6" />
             </div>
             <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-100">AI Business Insight</h3>
                <div className="space-y-3">
                   <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">English</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200 leading-relaxed">{aiInsight.english_insight}</p>
                   </div>
                   {aiInsight.telugu_insight && (
                     <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Telugu</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200 leading-relaxed">{aiInsight.telugu_insight}</p>
                     </div>
                   )}
                </div>
             </div>
             <button onClick={() => setAiInsight(null)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5"/></button>
          </div>
        </motion.div>
      )}

      {/* Placeholder / Empty State */}
      {!aiInsight && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="p-4 bg-muted rounded-full mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Ready to Analyze</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
            Click the "Ask AI Advisor" button to get actionable insights based on your recent transactions.
            </p>
        </div>
      )}

      {/* Chat Bot */}
      <ChatWidget transactions={transactions} />
    </motion.div>
  )
}

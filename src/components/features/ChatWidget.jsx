import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react'

// Placeholder for now as the original ChatWidget was not provided in the list
// but it is imported in Reports page.
export default function ChatWidget({ transactions }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
     { role: 'assistant', content: 'Hi! I am your AI Business Advisor. Ask me anything about your sales, expenses, or inventory trends.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
       // Simulate AI Response or call API
       // In a real app, this would call /api/chat
       // For migration, we will keep it simple or hook it up if we migrate the API later.
       setTimeout(() => {
           setMessages(prev => [...prev, { 
               role: 'assistant', 
               content: "I'm currently in migration mode. Once the backend is fully connected, I'll be able to analyze your data again!" 
           }])
           setLoading(false)
       }, 1000)
    } catch (e) {
        setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-40"
      >
         <MessageSquare className="w-7 h-7" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[500px] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
             {/* Header */}
             <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white">
                      <Bot className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="font-bold text-sm">AI Advisor</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                      </p>
                   </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          m.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-card border border-border shadow-sm rounded-tl-none'
                      }`}>
                         {m.content}
                      </div>
                   </div>
                ))}
                {loading && (
                   <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                         <Sparkles className="w-4 h-4 animate-spin text-purple-500" />
                         <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                   </div>
                )}
             </div>

             {/* Input */}
             <form onSubmit={handleSend} className="p-3 border-t border-border bg-card">
                <div className="relative">
                   <input 
                     className="w-full pl-4 pr-12 py-3 rounded-xl border border-border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                     placeholder="Ask about insights..."
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                   />
                   <button 
                     type="submit"
                     disabled={!input.trim() || loading}
                     className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                   >
                     <Send className="w-4 h-4" />
                   </button>
                </div>
             </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

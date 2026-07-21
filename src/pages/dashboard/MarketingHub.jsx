import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Sparkles, TrendingUp, AlertCircle, Download, Share2, Copy } from 'lucide-react'
import { useOrganization } from '../../context/OrganizationContext'

// Mock AI Generator Function (Replace with Gemini API later)
const generateAdContent = (type, item, shopName, discount) => {
  const templates = {
    'festival': [
      `✨ Celebrate with ${shopName}! ✨\nWishing you a season full of joy and prosperity. Visit us for special festive deals! 🪔 #Celebration #${shopName.replace(/\s/g, '')}`,
      `🎉 Festive Vibes at ${shopName}! 🎉\nGet the best quality items for your celebrations. Exclusive offers waiting for you. 🎁`
    ],
    'sale': [
      `🔥 HUGE SALE ALERT! 🔥\nGet amazing deals on ${item || 'everything'} at ${shopName}! ${discount ? `Up to ${discount} OFF!` : 'Best prices in town.'} Don't miss out! 🏃‍♂️💨`,
      `🛍️ Shop & Save at ${shopName}!\nQuality you trust, prices you'll love. ${item ? `Special offer on ${item}.` : ''} Visit us today!`
    ],
    'new': [
      `🆕 Just Arrived at ${shopName}! 🆕\nCheck out our latest collection of ${item || 'premium goodies'}. Fresh stock, best quality! 🌟`,
      `✨ New in Stock! ✨\n${item} is now available at ${shopName}. Be the first to grab it! 🛒`
    ]
  }
  
  const category = templates[type] || templates['sale']
  return category[Math.floor(Math.random() * category.length)]
}

export default function MarketingHub() {
  const { currentOrg } = useOrganization()
  const [loading, setLoading] = useState(true)
  const [inventory, setInventory] = useState([])
  const [suggestions, setSuggestions] = useState([])
  
  // generator state
  const [selectedType, setSelectedType] = useState('sale')
  const [customItem, setCustomItem] = useState('')
  const [discount, setDiscount] = useState('')
  const [generatedAd, setGeneratedAd] = useState('')

  useEffect(() => {
    fetchInsights()
  }, [currentOrg])

  const fetchInsights = async () => {
    if (!currentOrg) return
    try {
      setLoading(true)
      // Fetch high stock items (Potential Sale)
      const { data: items } = await supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .gt('quantity', 50) // Arbitrary "High Stock" threshold
        .limit(3)
      
      setInventory(items || [])
      
      // Generate suggestions
      if (items && items.length > 0) {
        setSuggestions(items.map(i => ({
          type: 'clearance',
          item: i.item_name,
          reason: `High stock (${i.quantity} units)`
        })))
      }
    } catch (error) {
      console.error('Error fetching marketing insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    const ad = generateAdContent(selectedType, customItem, currentOrg?.name || 'My Shop', discount)
    setGeneratedAd(ad)
  }

  const useSuggestion = (item) => {
    setCustomItem(item.item)
    setSelectedType('sale')
    setGeneratedAd(generateAdContent('sale', item.item, currentOrg?.name || 'My Shop', '15%'))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Hub</h1>
          <p className="text-muted-foreground">AI-powered tools to grow your business.</p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white text-sm font-semibold flex items-center shadow-lg">
          <Sparkles className="w-4 h-4 mr-2" />
          Powered by Gemini AI
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Generator & Inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2" />
                Smart Suggestions from your Inventory
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {suggestions.map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => useSuggestion(s)}
                    className="flex justify-between items-center p-4 bg-white dark:bg-card rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">Promote {s.item}</p>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </div>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generator Form */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
             <h2 className="text-xl font-semibold mb-6">Create New Ad</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="space-y-2">
                 <label className="text-sm font-medium">Occasion / Type</label>
                 <select 
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                 >
                   <option value="sale">Promotional Sale</option>
                   <option value="festival">Festival Greeting</option>
                   <option value="new">New Arrival</option>
                 </select>
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm font-medium">Highlight Item (Optional)</label>
                 <input 
                    type="text"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    placeholder="e.g. Rice, Fancy Saree"
                    className="w-full p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium">Discount Offer (Optional)</label>
                 <input 
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="e.g. 20% Off"
                    className="w-full p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                 />
               </div>
             </div>

             <button 
                onClick={handleGenerate}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
             >
               <Sparkles className="w-5 h-5" />
               Generate Creative Ad
             </button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
             <h2 className="text-xl font-semibold mb-6">Live Preview</h2>
             
             {generatedAd ? (
               <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 rounded-3xl shadow-2xl">
                 <div className="bg-background rounded-[22px] overflow-hidden">
                    {/* Fake Social Media Header */}
                    <div className="p-4 border-b border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground">
                        {currentOrg?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{currentOrg?.name || 'Shop Name'}</p>
                        <p className="text-xs text-muted-foreground">Sponsored</p>
                      </div>
                    </div>

                    {/* Ad Content */}
                    <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 opacity-50" />
                       <p className="relative z-10 text-center p-8 text-2xl font-bold text-slate-800 leading-tight">
                         {selectedType === 'sale' ? '🎉 SUPER SALE!' : selectedType === 'festival' ? '🪔 Happy Festivities' : '✨ Just Arrived'}
                       </p>
                    </div>

                    {/* Ad Caption */}
                    <div className="p-6">
                      <p className="text-foreground whitespace-pre-line leading-relaxed mb-4">
                        {generatedAd}
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-secondary/10 text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/20 transition-colors flex items-center justify-center gap-2">
                           <Copy className="w-4 h-4" /> Copy
                        </button>
                        <button className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                           <Download className="w-4 h-4" /> Save
                        </button>
                      </div>
                    </div>
                 </div>
               </div>
             ) : (
               <div className="bg-muted/10 border-2 border-dashed border-border rounded-3xl h-96 flex flex-col items-center justify-center text-center p-8">
                 <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                   <Sparkles className="w-8 h-8 text-muted-foreground" />
                 </div>
                 <p className="text-muted-foreground font-medium">Fill the form to generate your AI ad preview here.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

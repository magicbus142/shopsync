import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Printer, Save, Download, FileText, ShoppingBag, Upload, User, Phone, MapPin, Calendar, Hash, CreditCard, Store, Smartphone, Monitor, Share2, Languages, Camera } from 'lucide-react'
import { motion, Reorder } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import InvoiceTemplate from '../../components/invoice/InvoiceTemplate'
import { useToast } from '../../context/ToastContext'
import { useOrganization } from '../../context/OrganizationContext'
import Switch from '../../components/ui/Switch'
import html2pdf from 'html2pdf.js'
import { AccordionItem } from '../../components/ui/Accordion'

export default function InvoiceGenerator() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const componentRef = useRef(null)
  const toast = useToast()
  const { currentOrg } = useOrganization()

  // UI State
  const [openSections, setOpenSections] = useState(['items', 'payments']) 
  const [autoScale, setAutoScale] = useState(false)
  const [scale, setScale] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.5 : 0.75)
  const containerRef = useRef(null)

  // Auto-Scaling Logic
  useEffect(() => {
    if (!autoScale || !containerRef.current) {
        return
    }

    const calculateScale = () => {
        const container = containerRef.current
        if (!container) return

        const padding = 64 // 32px padding on each side
        const availableWidth = container.clientWidth - padding
        const availableHeight = container.clientHeight - padding
        
        const invoiceWidth = 794 // A4 width at 96 DPI approx (210mm)
        const invoiceHeight = 1123 // A4 height at 96 DPI approx (297mm)

        // Calculate scale to fit width (most important)
        let newScale = availableWidth / invoiceWidth
        
        // Ensure it also fits height if needed to prevent vertical scrolling
        newScale = Math.min(newScale, availableHeight / invoiceHeight)

        // Clamp scale
        newScale = Math.min(Math.max(newScale, 0.3), 1.0) 
        
        setScale(newScale)
    }

    calculateScale()
    
    // Resize Observer for robust responsiveness
    const observer = new ResizeObserver(calculateScale)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [autoScale])

  const toggleSection = (section) => {
      setOpenSections(prev => 
          prev.includes(section) 
              ? prev.filter(s => s !== section) 
              : [...prev, section]
      )
  }

  // Invoice State
  const [documentType, setDocumentType] = useState('INVOICE') // New State
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customer, setCustomer] = useState({
     name: '',
     phone: '',
     address: ''
  })
  const [items, setItems] = useState([
     { id: Date.now(), date: format(new Date(), 'yyyy-MM-dd'), name: '', quantity: 1, price: 0 }
  ])
  
  // Advanced Features State
  const [payments, setPayments] = useState([]) // Array of { id, date, amount }
  const [showSignature, setShowSignature] = useState(true)
  const [signatureImage, setSignatureImage] = useState(null)
  
  // Customer Photo State [NEW]
  const [showCustomerPhoto, setShowCustomerPhoto] = useState(false)
  const [customerPhoto, setCustomerPhoto] = useState(null)
  
  // Watermark State
  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkSize, setWatermarkSize] = useState(80)

  // Customization State
  const [showTerms, setShowTerms] = useState(true)
  const [showLogo, setShowLogo] = useState(true) 
  const [logoImage, setLogoImage] = useState(null)
  const [headerAlign, setHeaderAlign] = useState('left')
  const [templateType, setTemplateType] = useState('modern')
  const [brandColor, setBrandColor] = useState('#4F46E5') // [NEW] Default Indigo
  const [languageMode, setLanguageMode] = useState('both') // 'both', 'en', 'te', 'separate'
  const [paymentDetails, setPaymentDetails] = useState({
      show: false,
      phonePe: '',
      googlePay: '',
      upiId: ''
  })
  
  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',   // [NEW]
    instagram: '', // [NEW]
    facebook: ''   // [NEW]
  })

  // Load Defaults from LocalStorage (Per Org)
  useEffect(() => {
      if (!currentOrg) return

      const saved = localStorage.getItem(`invoice_defaults_${currentOrg.id}`)
      if (saved) {
          const parsed = JSON.parse(saved)
          setCompanyDetails(parsed.companyDetails || companyDetails)
          setBrandColor(parsed.brandColor || '#4F46E5') // [NEW] Load saved color
          setShowSignature(parsed.showSignature ?? true)
          setSignatureImage(parsed.signatureImage || null)
          setShowTerms(parsed.showTerms ?? true)
          setPaymentDetails(parsed.paymentDetails || paymentDetails)
          setShowLogo(parsed.showLogo ?? true)
          setLogoImage(parsed.logoImage || null)
          setWatermarkText(parsed.watermarkText || '')
          setWatermarkSize(parsed.watermarkSize || 80)
          setShowCustomerPhoto(parsed.showCustomerPhoto || false)
          setCustomerPhoto(parsed.customerPhoto || null)
      } else {
          // No saved defaults for this org, initialize with Org Name
          setCompanyDetails({
              name: currentOrg.name || '',
              address: '',
              phone: '',
              email: ''
          })
          setSignatureImage(null) // Reset signature for new org
          setLogoImage(null) // Reset logo for new org
          setWatermarkText('')
          setWatermarkSize(80)
      }
  }, [currentOrg])

  // Save Defaults
  const saveDefaults = () => {
      if (!currentOrg) return
      
      localStorage.setItem(`invoice_defaults_${currentOrg.id}`, JSON.stringify({
          companyDetails,
          brandColor, // [NEW] Save color
          showSignature,
          signatureImage,
          showTerms,
          paymentDetails,
          showLogo,
          logoImage,
          watermarkText,
          watermarkSize,
          showCustomerPhoto, // [NEW] Save preference
          customerPhoto
      }))
      toast.success('Default settings saved!')
  }

  // Fetch Products for Autocomplete
  useEffect(() => {
     fetchProductsSelect()
     generateInvoiceNumber()
  }, [])

  const fetchProductsSelect = async () => {
     const { data, error } = await supabase.from('products').select('id, name, price, stock')
     if (data) setProducts(data)
     setLoading(false)
  }

  const generateInvoiceNumber = () => {
     // Simple ID generation - in real app, fetch last ID from DB
     const random = Math.floor(1000 + Math.random() * 9000)
     setInvoiceNumber(`INV-${format(new Date(), 'yyMM')}-${random}`)
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0)
  const total = subtotal 
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0) + items.reduce((acc, item) => acc + Number(item.paid || 0), 0)
  const balanceDue = Math.max(0, total - totalPaid)

  // Customer Autofill Logic
  const [isCustomerLoading, setIsCustomerLoading] = useState(false)

  // 1. Fetch Customer on Phone Change
  useEffect(() => {
      if (!customer.phone || customer.phone.length < 10 || !currentOrg) return

      const fetchCustomer = async () => {
          setIsCustomerLoading(true)
          const { data, error } = await supabase
              .from('customers')
              .select('*')
              .eq('organization_id', currentOrg.id)
              .eq('phone', customer.phone)
              .single()
          
          if (data) {
              setCustomer(prev => ({
                  ...prev,
                  name: data.name || prev.name,
                  address: data.address || prev.address
              }))
              toast.success('✨ Customer found!', { duration: 2000 })
          }
          setIsCustomerLoading(false)
      }

      // Debounce slightly or just run
      const timer = setTimeout(fetchCustomer, 500)
      return () => clearTimeout(timer)
  }, [customer.phone, currentOrg])

  // 2. Save Customer Helper
  const saveCustomer = async () => {
      if (!customer.phone || !customer.name || !currentOrg) return

      try {
          const { error } = await supabase
              .from('customers')
              .upsert({
                  organization_id: currentOrg.id,
                  phone: customer.phone,
                  name: customer.name,
                  address: customer.address
              }, { onConflict: 'organization_id, phone' })
              
          if (error) console.error("Failed to save customer", error)
      } catch (err) {
          console.error("Save customer error:", err)
      }
  }

  // Handlers
  const handleAddItem = () => {
     const newItems = [...items, { id: Date.now(), date: invoiceDate, name: '', quantity: 1, price: 0, paid: 0 }]
     setItems(newItems)
     // Ensure both Items and Payments sections are open when adding items
     if (!openSections.includes('payments')) {
         setOpenSections(prev => [...prev, 'payments'])
     }
  }

  const handleAddPayment = () => {
      setPayments([...payments, { id: Date.now(), date: invoiceDate, amount: '' }])
  }

  const handlePaymentChange = (id, field, value) => {
      setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleRemovePayment = (id) => {
      setPayments(payments.filter(p => p.id !== id))
  }

  const handleRemoveItem = (id) => {
     if (items.length > 1) {
        setItems(items.filter(i => i.id !== id))
     }
  }

  const handleItemChange = (id, field, value) => {
      const newItems = items.map(item => {
          if (item.id === id) {
             const updated = { ...item, [field]: value }
             // Auto-fill price if name matches a product
             if (field === 'name') {
                 const product = products.find(p => p.name === value)
                 if (product) {
                     updated.price = product.price
                     updated.productId = product.id // Store ID for potential inventory sync later
                 }
             }
             return updated
          }
          return item
      })
      setItems(newItems)
  }

  // Print Handler
  const handlePrint = () => {
    saveCustomer(); // Save customer for next time
    window.print();
  };

  const handleDownload = () => {
      saveCustomer(); // Save customer
      const element = componentRef.current
      const opt = {
          margin: 0,
          filename: `Invoice-${invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      
      // Use html2pdf promise to handle success/error
      html2pdf().set(opt).from(element).save().then(() => {
          toast.success('Invoice downloaded successfully!')
      }).catch(err => {
          console.error('PDF Download Error:', err)
          toast.error('Failed to download PDF')
      })
  }

  const handleWhatsAppShare = async () => {
      saveCustomer(); // Save customer
      const shareText = `*Invoice #${invoiceNumber}*\nDate: ${format(new Date(invoiceDate), 'dd MMM yyyy')}\nBilled To: ${customer.name}\nTotal Amount: ₹${total.toLocaleString()}\n\nPlease find the invoice PDF attached.`

      // 1. Desktop / No Native Share: Fast Path
      // We skip Blob generation to avoid lag and popup blockers
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      if (!navigator.share || !navigator.canShare || !isMobile) {
          handleDownload()
          const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
          window.open(url, '_blank')
          toast.info("Opening WhatsApp... Please drag the downloaded PDF into the chat.")
          return
      }

      // 2. Mobile / Native Share: Generate Blob to attach
      try {
          toast.loading("Preparing PDF for WhatsApp...")
          
          const element = componentRef.current
          const opt = {
              margin: 0,
              filename: `Invoice-${invoiceNumber}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }

          const worker = html2pdf().set(opt).from(element).toPdf().get('pdf')
          const pdfBlob = await worker.output('blob')
          const pdfFile = new File([pdfBlob], `Invoice-${invoiceNumber}.pdf`, { type: 'application/pdf' })

          if (navigator.canShare({ files: [pdfFile] })) {
               await navigator.share({
                   files: [pdfFile],
                   title: `Invoice-${invoiceNumber}`,
                   text: shareText
               })
               toast.dismiss()
               toast.success("Shared successfully!")
          } else {
              throw new Error("Device doesn't support file sharing")
          }

      } catch (error) {
          console.error("Mobile share failed, falling back", error)
          toast.dismiss()
          // Fallback to desktop method if native share creates blob but fails to share
          handleDownload()
          const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
          window.open(url, '_blank')
      }
  }

  const templateData = {
     documentTitle: documentType, // Passing dynamic title
     headerAlign, // Pass to template
     customer,
     items,
     invoiceDate: format(new Date(invoiceDate), 'dd MMM yyyy'),
     invoiceNumber,
     subtotal,
     total,
     companyDetails,
     payments,
     totalPaid,
     balanceDue,
     showSignature,
     signatureImage,
     showTerms,
     paymentDetails,
     showLogo,
     logoImage,
     watermarkText,
     watermarkSize,
     showCustomerPhoto,
     watermarkSize,
     showCustomerPhoto,
     customerPhoto,
     brandColor // [NEW] Pass to template
  };

  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-content, #print-content * {
        visibility: visible;
      }
      #print-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      /* Hide all direct children of body except the app root if needed, but visibility hidden usually suffices */
    }
  `;

  return (
    <>
    <style>{printStyles}</style>
    <div className="flex flex-col xl:flex-row xl:h-[calc(100vh-6rem)] h-auto gap-6 transition-all duration-300 ease-in-out no-print">
       
       {/* LEFT: EDITOR SECTION (Scrollable) */}
       <div className="w-full xl:w-[450px] flex flex-col h-full bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
           
           {/* Header */}
           <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
               <h2 className="font-bold text-lg">Invoice Structure</h2>
               <button 
                  onClick={saveDefaults}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                   Save Defaults
                </button>
           </div>

           {/* Content List */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
               
               {/* 1. Header & Company */}
               <AccordionItem 
                 title="Header & Company" 
                 icon={Store} 
                 isOpen={openSections.includes('header')} 
                 onToggle={() => toggleSection('header')}
               >
                 <div className="space-y-4">
                     {/* Document Type Selector */}
                     <div>
                        <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Document Type</label>
                        <select 
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-full p-2 rounded-md border border-input text-sm bg-background"
                        >
                            <option value="INVOICE">INVOICE</option>
                            <option value="BILL">BILL-RECEIPT</option>
                            <option value="QUOTATION">QUOTATION</option>
                            <option value="RECEIPT">RECEIPT</option>
                        </select>
                      </div>
                     <hr className="border-border" />



                     {/* Logo Toggle */}
                     <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Show Logo</span>
                        <Switch checked={showLogo} onChange={setShowLogo} />
                     </div>
                     
                     {showLogo && (
                         <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-white border border-border rounded-lg flex items-center justify-center p-1">
                                {logoImage ? <img src={logoImage} className="max-w-full max-h-full object-contain" /> : <ShoppingBag className="text-muted-foreground/30" />}
                            </div>
                            <label className="flex-1 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 text-center transition-colors">
                                Upload Logo
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                      const file = e.target.files[0]
                                      if (file) {
                                          const reader = new FileReader()
                                          reader.onloadend = () => setLogoImage(reader.result)
                                          reader.readAsDataURL(file)
                                      }
                                }} />
                            </label>
                         </div>
                     )}

                     <div className="space-y-3">
                        <input type="text" value={companyDetails.name} onChange={e => setCompanyDetails({...companyDetails, name: e.target.value})} className="w-full p-2 rounded-md border border-input text-sm" placeholder="Shop Name" />
                        <input type="text" value={companyDetails.phone} onChange={e => setCompanyDetails({...companyDetails, phone: e.target.value})} className="w-full p-2 rounded-md border border-input text-sm" placeholder="Phone Number" />
                        <textarea value={companyDetails.address} onChange={e => setCompanyDetails({...companyDetails, address: e.target.value})} className="w-full p-2 rounded-md border border-input text-sm" placeholder="Shop Address" rows={2} />
                        
                        {/* [NEW] Social Media Inputs */}
                        <div className="grid grid-cols-3 gap-2">
                             <input type="text" value={companyDetails.website} onChange={e => setCompanyDetails({...companyDetails, website: e.target.value})} className="w-full p-2 rounded-md border border-input text-xs" placeholder="Website" />
                             <input type="text" value={companyDetails.instagram} onChange={e => setCompanyDetails({...companyDetails, instagram: e.target.value})} className="w-full p-2 rounded-md border border-input text-xs" placeholder="Instagram" />
                             <input type="text" value={companyDetails.facebook} onChange={e => setCompanyDetails({...companyDetails, facebook: e.target.value})} className="w-full p-2 rounded-md border border-input text-xs" placeholder="Facebook" />
                        </div>
                     </div>
                 </div>
               </AccordionItem>

               {/* Watermark Section */}
               <AccordionItem 
                 title="Watermark Settings" 
                 icon={FileText} // Reusing FileText or specialized icon
                 isOpen={openSections.includes('watermark')} 
                 onToggle={() => toggleSection('watermark')}
               >
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Watermark Text</label>
                            <input 
                              type="text" 
                              value={watermarkText} 
                              onChange={(e) => setWatermarkText(e.target.value)} 
                              placeholder="e.g. DRAFT or PAID"
                              className="w-full p-2 rounded-md border border-input text-sm" 
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use Company Name</p>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold">Font Size</label>
                                <span className="text-xs font-mono">{watermarkSize}px</span>
                            </div>
                            <input 
                              type="range" 
                              min="20" 
                              max="200" 
                              step="5"
                              value={watermarkSize} 
                              onChange={(e) => setWatermarkSize(Number(e.target.value))} 
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
               </AccordionItem>

               {/* 2. Invoice Details */}
               <AccordionItem 
                 title="Invoice Details" 
                 icon={FileText} 
                 isOpen={openSections.includes('details')} 
                 onToggle={() => toggleSection('details')}
               >
                   <div className="grid grid-cols-2 gap-3">
                       <div>
                           <label className="text-xs text-muted-foreground uppercase font-bold">Invoice No</label>
                           <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full p-2 rounded-md border border-input text-sm font-mono" />
                       </div>
                       <div>
                           <label className="text-xs text-muted-foreground uppercase font-bold">Date</label>
                           <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full p-2 rounded-md border border-input text-sm" />
                       </div>
                   </div>
               </AccordionItem>

               {/* 3. Customer */}
               <AccordionItem 
                 title="Customer (Billed To)" 
                 icon={User} 
                 isOpen={openSections.includes('customer')} 
                 onToggle={() => toggleSection('customer')}
               >
                    <div className="space-y-3">
                        <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full p-2 rounded-md border border-input text-sm" placeholder="Customer Name" />
                        <div className="relative">
                            <input 
                                type="text" 
                                value={customer.phone} 
                                onChange={e => setCustomer({...customer, phone: e.target.value})} 
                                className={`w-full p-2 rounded-md border border-input text-sm ${isCustomerLoading ? 'animate-pulse bg-indigo-50' : ''}`} 
                                placeholder="Phone Number (Auto-fill)" 
                            />
                            {isCustomerLoading && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <span className="loading loading-spinner loading-xs text-primary"></span>
                                </div>
                            )}
                        </div>
                        <textarea value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full p-2 rounded-md border border-input text-sm" placeholder="Billing Address" rows={2} />
                        
                        <hr className="border-border" />
                        
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Camera className="w-3 h-3" /> Customer Photo</span>
                            <Switch checked={showCustomerPhoto} onChange={setShowCustomerPhoto} />
                        </div>

                        {showCustomerPhoto && (
                             <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-muted border border-border rounded flex items-center justify-center overflow-hidden">
                                    {customerPhoto ? <img src={customerPhoto} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-muted-foreground/30" />}
                                </div>
                                <label className="flex-1 text-xs bg-muted border border-dashed border-border p-2 rounded text-center cursor-pointer hover:bg-muted/80">
                                    {customerPhoto ? 'Change Photo' : 'Upload Photo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                          const file = e.target.files[0]
                                          if (file) {
                                              const reader = new FileReader()
                                              reader.onloadend = () => setCustomerPhoto(reader.result)
                                              reader.readAsDataURL(file)
                                          }
                                    }} />
                                </label>
                             </div>
                        )}
                        </div>
                    </AccordionItem>

                    <AccordionItem 
                        title="Visual Style" 
                        isOpen={openSections.includes('style')}
                        onToggle={() => toggleSection('style')}
                        icon={Monitor}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Template Style</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['modern', 'classic', 'minimal'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTemplateType(type)}
                                            className={`px-3 py-2 text-sm border rounded-md capitalize transition-colors ${
                                                templateType === type 
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' 
                                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <hr className="border-border" />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Languages className="w-4 h-4" /> Language
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'both', label: 'Bilingual (Bi)' },
                                        { id: 'en', label: 'English Only' },
                                        { id: 'te', label: 'Telugu Only' },
                                        { id: 'separate', label: 'Separate Pages' }
                                    ].map((lang) => (
                                        <button
                                            key={lang.id}
                                            onClick={() => setLanguageMode(lang.id)}
                                            className={`px-3 py-2 text-xs border rounded-md capitalize transition-colors ${
                                                languageMode === lang.id 
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' 
                                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-border" />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        value={brandColor} 
                                        onChange={(e) => setBrandColor(e.target.value)}
                                        className="h-10 w-10 p-1 rounded cursor-pointer border border-gray-300" 
                                    />
                                    <input 
                                        type="text" 
                                        value={brandColor} 
                                        onChange={(e) => setBrandColor(e.target.value)}
                                        className="p-2 border rounded-md text-sm uppercase"
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

               {/* 4. Line Items */}
               <AccordionItem 
                 title="Line Items" 
                 icon={ShoppingBag} 
                 isOpen={openSections.includes('items')} 
                 onToggle={() => toggleSection('items')}
               >
                    <div className="space-y-4">
                        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-4">
                            {items.map((item, i) => (
                                <Reorder.Item key={item.id} value={item} style={{ position: 'relative' }}>
                                    <div className="p-3 bg-muted/20 rounded-lg border border-border relative group">
                                        <button onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                        
                                        {/* Drag Handle Indicator (Visual only) */}
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground/30 cursor-grab active:cursor-grabbing hover:text-muted-foreground">
                                            <svg width="10" height="20" viewBox="0 0 10 20" fill="currentColor">
                                                <circle cx="2" cy="2" r="1.5" />
                                                <circle cx="8" cy="2" r="1.5" />
                                                <circle cx="2" cy="10" r="1.5" />
                                                <circle cx="8" cy="10" r="1.5" />
                                                <circle cx="2" cy="18" r="1.5" />
                                                <circle cx="8" cy="18" r="1.5" />
                                            </svg>
                                        </div>

                                        <div className="grid grid-cols-12 gap-2 pl-4"> {/* Added padding-left for drag handle */}
                                            <div className="col-span-12 mb-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Item</label>
                                                    <input type="date" value={item.date || invoiceDate} onChange={e => handleItemChange(item.id, 'date', e.target.value)} className="p-1 text-[10px] border rounded bg-transparent mr-6" />
                                                </div>
                                                <input list={`products-${item.id}`} type="text" value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="w-full p-1.5 rounded border border-input text-sm font-bold" placeholder="Item Name" />
                                                <datalist id={`products-${item.id}`}>{products.map(p => <option key={p.id} value={p.name}>₹{p.price}</option>)}</datalist>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Qty</label>
                                                <input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full p-1.5 rounded border border-input text-sm text-center" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Price</label>
                                                <input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} className="w-full p-1.5 rounded border border-input text-sm text-right" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Paid</label>
                                                <input type="number" value={item.paid || 0} onChange={e => handleItemChange(item.id, 'paid', e.target.value)} className="w-full p-1.5 rounded border border-input text-sm text-right text-green-600 bg-green-50" />
                                            </div>
                                            <div className="col-span-3 flex flex-col items-end justify-center">
                                                <span className="text-[10px] text-muted-foreground">Total</span>
                                                <span className="font-bold text-sm">₹{(item.quantity * item.price).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                        <button onClick={handleAddItem} className="w-full py-2 bg-primary/5 border border-primary/20 text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                    </div>
               </AccordionItem>

               {/* 5. Payments & Totals */}
               <AccordionItem 
                 title="Payments & Totals" 
                 icon={CreditCard} 
                 isOpen={openSections.includes('payments')} 
                 onToggle={() => toggleSection('payments')}
               >
                   <div className="space-y-4">
                       <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                           <span className="text-sm font-medium">Subtotal</span>
                           <span className="font-bold">₹{total.toLocaleString()}</span>
                       </div>

                       <div className="space-y-2">
                           <div className="flex justify-between items-center">
                               <span className="text-xs font-bold uppercase text-muted-foreground">Payments Received</span>
                               <button onClick={handleAddPayment} className="text-xs text-primary hover:underline">+ Add</button>
                           </div>
                           {payments.map(p => (
                               <div key={p.id} className="flex gap-2">
                                   <input type="date" value={p.date} onChange={e => handlePaymentChange(p.id, 'date', e.target.value)} className="w-1/3 p-1 text-xs border rounded" />
                                   <input type="number" value={p.amount} onChange={e => handlePaymentChange(p.id, 'amount', e.target.value)} className="flex-1 p-1 text-xs border rounded" placeholder="Amount" />
                                   <button onClick={() => handleRemovePayment(p.id)} className="text-red-500"><Trash2 className="w-3" /></button>
                               </div>
                           ))}
                       </div>

                       <div className="flex justify-between items-center border-t border-border pt-2">
                           <span className="font-bold text-primary">Balance Due</span>
                           <span className="text-lg font-bold text-primary">₹{balanceDue.toLocaleString()}</span>
                       </div>
                   </div>
               </AccordionItem>

               {/* 6. Footer & Signatures */}
               <AccordionItem 
                 title="Footer & Signatures" 
                 icon={Hash} 
                 isOpen={openSections.includes('footer')} 
                 onToggle={() => toggleSection('footer')}
               >
                   <div className="space-y-4">
                       <div className="flex justify-between items-center">
                            <span className="text-sm">Show Terms & Conditions</span>
                            <Switch checked={showTerms} onChange={setShowTerms} />
                       </div>
                       
                       <div className="flex justify-between items-center">
                           <span className="text-sm">Show Signature</span>
                           <Switch checked={showSignature} onChange={setShowSignature} />
                       </div>
                       {showSignature && (
                           <div className="flex items-center gap-3">
                               <label className="flex-1 text-xs bg-muted border border-dashed border-border p-3 rounded text-center cursor-pointer hover:bg-muted/80">
                                   {signatureImage ? 'Change Signature' : 'Upload Signature'}
                                   <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                      const file = e.target.files[0]
                                      if (file) {
                                          const reader = new FileReader()
                                          reader.onloadend = () => setSignatureImage(reader.result)
                                          reader.readAsDataURL(file)
                                      }
                                }} />
                               </label>
                           </div>
                       )}

                       <div className="pt-4 border-t border-border">
                           <div className="flex justify-between items-center mb-2">
                               <span className="text-sm">Payment Info</span>
                               <Switch checked={paymentDetails.show} onChange={c => setPaymentDetails({...paymentDetails, show: c})} />
                           </div>
                           {paymentDetails.show && (
                               <div className="space-y-2">
                                   <input type="text" value={paymentDetails.phonePe} onChange={e => setPaymentDetails({...paymentDetails, phonePe: e.target.value})} className="w-full p-2 border rounded text-xs" placeholder="PhonePe" />
                                   <input type="text" value={paymentDetails.googlePay} onChange={e => setPaymentDetails({...paymentDetails, googlePay: e.target.value})} className="w-full p-2 border rounded text-xs" placeholder="Google Pay" />
                                   <input type="text" value={paymentDetails.upiId} onChange={e => setPaymentDetails({...paymentDetails, upiId: e.target.value})} className="w-full p-2 border rounded text-xs" placeholder="UPI ID" />
                               </div>
                           )}
                       </div>
                   </div>
               </AccordionItem>
           </div>
       </div>

       {/* RIGHT: LIVE PREVIEW SECTION */}
       <div className="flex-1 flex flex-col min-w-0 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-border shadow-sm overflow-hidden relative">
           
           {/* Preview Toolbar */}
           <div className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm z-20">
               <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest hidden md:block">Live Preview</span>
               
               <div className="flex items-center gap-2">
                    <select
                        value={autoScale ? 'fit' : Math.round(scale * 100)}
                        onChange={(e) => {
                            const val = e.target.value
                            if (val === 'fit') {
                                setAutoScale(true)
                            } else {
                                setAutoScale(false)
                                setScale(Number(val) / 100)
                            }
                        }}
                        className="h-8 text-xs border border-border rounded-lg bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="fit">Fit to Screen</option>
                        <option value="50">50%</option>
                        <option value="75">75%</option>
                        <option value="100">100%</option>
                    </select>

                    <button 
                       onClick={handlePrint}
                       className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                       title="Print Invoice"
                   >
                       <Printer className="w-5 h-5" />
                   </button>

                    <button 
                       onClick={handleWhatsAppShare}
                       className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors"
                       title="Share on WhatsApp"
                   >
                       <Share2 className="w-5 h-5" />
                   </button>
                   <button 
                     onClick={handleDownload}
                     className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 shadow transition-all"
                   >
                       <Download className="w-4 h-4" /> Download PDF
                   </button>
               </div>
           </div>

           {/* Preview Canvas */}
           <div ref={containerRef} className={`flex-1 p-8 bg-zinc-100/50 relative ${autoScale ? 'overflow-hidden' : 'overflow-auto flex justify-center'}`}>
               <div 
                 className={`bg-white shadow-2xl transition-all print:shadow-none print:w-full print:max-w-none ${autoScale ? 'absolute top-1/2 left-1/2 origin-center' : 'origin-top my-8'}`}
                 style={autoScale ? { 
                     transform: `translate(-50%, -50%) scale(${scale})`, 
                     width: '794px', 
                     height: '1123px',
                 } : { 
                     transform: `scale(${scale})`,
                     width: '794px',
                     minHeight: '1123px'
                 }}
               >
                   {languageMode === 'separate' ? (
                       <div className="flex flex-col gap-8">
                           <InvoiceTemplate data={templateData} templateType={templateType} language="en" />
                           <InvoiceTemplate data={templateData} templateType={templateType} language="te" />
                       </div>
                   ) : (
                       <InvoiceTemplate data={templateData} templateType={templateType} language={languageMode} />
                   )}
               </div>
           </div>
            
       </div>
    </div>

   {/* Hidden component for Print/PDF - Moved OUTSIDE the no-print wrapper */}
   <div className="print-only">
        <div ref={componentRef} id="print-content">
            {languageMode === 'separate' ? (
                <div>
                    <InvoiceTemplate data={templateData} templateType={templateType} language="en" />
                    <div style={{ pageBreakBefore: 'always' }} />
                    <InvoiceTemplate data={templateData} templateType={templateType} language="te" />
                </div>
            ) : (
                <InvoiceTemplate data={templateData} templateType={templateType} language={languageMode} />
            )}
        </div>
   </div>
   </>
  )
}

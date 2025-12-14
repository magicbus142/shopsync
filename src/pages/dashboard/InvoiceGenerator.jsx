import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Plus, Trash2, Printer, Save, Download, FileText, ShoppingBag, Upload, User, Phone, MapPin, Calendar, Hash, CreditCard, Store } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import InvoiceTemplate from '../../components/invoice/InvoiceTemplate'
import { useToast } from '../../context/ToastContext'
import { useOrganization } from '../../context/OrganizationContext'
import Switch from '../../components/ui/Switch'
import html2pdf from 'html2pdf.js'

export default function InvoiceGenerator() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const componentRef = useRef()
  const toast = useToast()
  const { currentOrg } = useOrganization()

  // Invoice State
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
  
  // Customization State
  const [showTerms, setShowTerms] = useState(true)
  const [showLogo, setShowLogo] = useState(true) // New State
  const [logoImage, setLogoImage] = useState(null) // New State
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
    email: ''
  })

  // Load Defaults from LocalStorage (Per Org)
  useEffect(() => {
      if (!currentOrg) return

      const saved = localStorage.getItem(`invoice_defaults_${currentOrg.id}`)
      if (saved) {
          const parsed = JSON.parse(saved)
          setCompanyDetails(parsed.companyDetails || companyDetails)
          setShowSignature(parsed.showSignature ?? true)
          setSignatureImage(parsed.signatureImage || null)
          setShowTerms(parsed.showTerms ?? true)
          setPaymentDetails(parsed.paymentDetails || paymentDetails)
          setShowLogo(parsed.showLogo ?? true)
          setLogoImage(parsed.logoImage || null)
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
      }
  }, [currentOrg])

  // Save Defaults
  const saveDefaults = () => {
      if (!currentOrg) return
      
      localStorage.setItem(`invoice_defaults_${currentOrg.id}`, JSON.stringify({
          companyDetails,
          showSignature,
          signatureImage,
          showTerms,
          paymentDetails,
          showLogo,
          logoImage
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
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balanceDue = Math.max(0, total - totalPaid)

  // Handlers
  const handleAddItem = () => {
     setItems([...items, { id: Date.now(), date: invoiceDate, name: '', quantity: 1, price: 0 }])
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
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-${invoiceNumber}`,
    onAfterPrint: () => toast.success('Invoice printed successfully!')
  });

  const handleDownload = () => {
      const element = componentRef.current
      const opt = {
          margin: 0,
          filename: `Invoice-${invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            ignoreElements: (element) => element.tagName === 'LINK' || element.tagName === 'STYLE'
          },
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

  const templateData = {
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
     logoImage
  };

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-2rem)] gap-6">
       {/* LEFT: FORM SECTION */}
       <div className="w-full xl:w-5/12 flex flex-col gap-6 overflow-y-auto pr-2 pb-20">
           <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative group">
             <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Company Details
                </h2>
                <button 
                  onClick={saveDefaults}
                  className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded border border-border"
                  title="Save as default for future invoices"
                >
                   Save as Default
                </button>
             </div>
             
             {/* Logo Upload Section */}
             <div className="mb-4 p-4 bg-muted/30 rounded-xl border border-border">
                 <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold flex items-center gap-2">
                       <ShoppingBag className="w-4 h-4 text-primary" /> Company Logo
                    </span>
                    <Switch 
                      checked={showLogo} 
                      onChange={setShowLogo}
                    />
                 </div>
                 {showLogo && (
                     <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-white rounded border border-input flex items-center justify-center overflow-hidden">
                            {logoImage ? (
                                <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <ShoppingBag className="w-5 h-5 text-gray-300" />
                            )}
                        </div>
                        <label className="flex-1 cursor-pointer">
                            <span className="text-xs bg-white border border-input px-3 py-1.5 rounded hover:bg-gray-50 inline-block text-center w-full">
                                {logoImage ? 'Change Logo' : 'Upload Logo'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                  const file = e.target.files[0]
                                  if (file) {
                                      const reader = new FileReader()
                                      reader.onloadend = () => setLogoImage(reader.result)
                                      reader.readAsDataURL(file)
                                  }
                              }}
                            />
                        </label>
                        {logoImage && (
                            <button onClick={() => setLogoImage(null)} className="text-red-500 hover:bg-red-50 p-1.5 rounded border border-transparent hover:border-red-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                     </div>
                 )}
             </div>

             <div className="space-y-4">
                 <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Shop Name</label>
                    <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={companyDetails.name} 
                          onChange={(e) => setCompanyDetails({...companyDetails, name: e.target.value})}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="My Awesome Shop"
                        />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                              type="text" 
                              value={companyDetails.phone} 
                              onChange={(e) => setCompanyDetails({...companyDetails, phone: e.target.value})}
                              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="+91 00000 00000"
                            />
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <textarea 
                              value={companyDetails.address} 
                              onChange={(e) => setCompanyDetails({...companyDetails, address: e.target.value})}
                              rows={1}
                              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none min-h-[42px]"
                              placeholder="Shop Address..."
                            />
                        </div>
                     </div>
                 </div>
             </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Invoice Details
             </h2>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Invoice No</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={invoiceNumber} 
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-sm"
                        />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="date" 
                          value={invoiceDate} 
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        />
                    </div>
                 </div>
             </div>

             <div className="space-y-4 mb-6 pt-4 border-t border-dashed border-border">
                 <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Billed To
                 </h3>
                 <div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={customer.name} 
                          onChange={(e) => setCustomer({...customer, name: e.target.value})}
                          placeholder="Customer Name"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                        />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={customer.phone} 
                          onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                          placeholder="Phone Number"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <textarea 
                          value={customer.address} 
                          onChange={(e) => setCustomer({...customer, address: e.target.value})}
                          placeholder="Billing Address..."
                          rows={1}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none min-h-[42px]"
                        />
                    </div>
                 </div>
             </div>

             <div className="space-y-4 mb-6">
                 <div>
                    <label className="block text-sm font-medium mb-1">Customer Name</label>
                    <input 
                      type="text" 
                      value={customer.name} 
                      onChange={(e) => setCustomer({...customer, name: e.target.value})}
                      placeholder="Enter customer name"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input 
                          type="text" 
                          value={customer.phone} 
                          onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                          placeholder="Phone number"
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <textarea 
                          value={customer.address} 
                          onChange={(e) => setCustomer({...customer, address: e.target.value})}
                          placeholder="Billing address"
                          rows={1}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                        />
                    </div>
                 </div>
             </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex-1">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Items</h2>
                <button 
                  onClick={handleAddItem}
                  className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors"
                  title="Add Item"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>

             <div className="space-y-3">
                 {items.map((item, index) => (
                    <div key={item.id} className="relative p-4 rounded-xl bg-muted/30 border border-border group hover:border-primary/50 transition-colors">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className={`absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full shadow-sm hover:bg-red-200 transition-all z-10 ${items.length === 1 ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                           <Trash2 className="w-3 h-3" />
                        </button>
                        
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-4">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Date</label>
                                <input 
                                  type="date" 
                                  value={item.date || ''} 
                                  onChange={(e) => handleItemChange(item.id, 'date', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-background/50 focus:bg-background text-xs"
                                />
                            </div>
                            <div className="col-span-8">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Item Description</label>
                                <input 
                                  list={`products-${item.id}`}
                                  type="text" 
                                  value={item.name} 
                                  onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                  placeholder="Item Name"
                                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-background/50 focus:bg-background text-sm font-medium"
                                />
                                <datalist id={`products-${item.id}`}>
                                    {products.map(p => (
                                        <option key={p.id} value={p.name}>₹{p.price} (Stock: {p.stock})</option>
                                    ))}
                                </datalist>
                            </div>
                            
                            <div className="col-span-3">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Qty</label>
                                <input 
                                  type="number" 
                                  value={item.quantity} 
                                  onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                  min="1"
                                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-background/50 focus:bg-background text-sm text-center font-mono"
                                />
                            </div>
                            <div className="col-span-4">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Price</label>
                                <input 
                                  type="number" 
                                  value={item.price} 
                                  onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-background/50 focus:bg-background text-sm text-right font-mono"
                                />
                            </div>
                             <div className="col-span-5 flex flex-col justify-end items-end pb-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Amount</span>
                                <span className="text-sm font-bold text-primary">₹{(item.quantity * item.price).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                 ))}
             </div>

             <div className="mt-6 pt-4 border-t border-border space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Subtotal</span>
                    <span className="font-bold">₹{total.toLocaleString()}</span>
                 </div>
                 
                 {/* Payments Section */}
                 <div className="border-t border-dashed border-border pt-2">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Payments</span>
                        <button onClick={handleAddPayment} className="text-xs text-primary hover:underline">+ Add Payment</button>
                     </div>
                     <div className="space-y-2">
                         {payments.map(p => (
                             <div key={p.id} className="flex gap-2 items-center">
                                 <input 
                                   type="date" 
                                   value={p.date} 
                                   onChange={(e) => handlePaymentChange(p.id, 'date', e.target.value)}
                                   className="w-28 px-2 py-1 text-xs rounded border border-input"
                                 />
                                 <input 
                                   type="number" 
                                   value={p.amount} 
                                   onChange={(e) => handlePaymentChange(p.id, 'amount', e.target.value)}
                                   placeholder="Amount"
                                   className="flex-1 px-2 py-1 text-xs rounded border border-input text-right"
                                 />
                                 <button onClick={() => handleRemovePayment(p.id)} className="text-red-500 hover:text-red-700">
                                     <Trash2 className="w-3 h-3" />
                                 </button>
                             </div>
                         ))}
                     </div>
                 </div>

                 <div className="flex justify-between items-center border-t border-dashed border-border pt-2">
                     <span className="text-sm font-medium">Total Paid</span>
                     <span className="font-bold text-green-600">₹{totalPaid.toLocaleString()}</span>
                 </div>

                 <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                     <span className="text-base font-bold text-primary">Balance Due</span>
                     <span className="text-xl font-bold text-primary">₹{balanceDue.toLocaleString()}</span>
                 </div>
             </div>

             {/* Signature Settings */}
             <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-sm font-medium">Authorized Signatory</span>
                   <Switch 
                     checked={showSignature} 
                     onChange={setShowSignature}
                   />
                </div>
                {showSignature && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs bg-muted px-3 py-2 rounded cursor-pointer hover:bg-muted/80 w-full text-center border border-dashed border-border">
                            {signatureImage ? 'Change Signature Image' : 'Upload Signature Image'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                  const file = e.target.files[0]
                                  if (file) {
                                      const reader = new FileReader()
                                      reader.onloadend = () => setSignatureImage(reader.result)
                                      reader.readAsDataURL(file)
                                  }
                              }}
                            />
                        </label>
                        {signatureImage && (
                            <button onClick={() => setSignatureImage(null)} className="p-2 hover:bg-red-50 text-red-500 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
             </div>

             {/* Footer Customization */}
             <div className="mt-6 pt-4 border-t border-border space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show Terms & Conditions</span>
                    <Switch 
                      checked={showTerms} 
                      onChange={setShowTerms}
                    />
                 </div>
                 
                 <div className="pt-2 border-t border-dashed border-border">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">Show Payment QR / Info</span>
                        <Switch 
                          checked={paymentDetails.show} 
                          onChange={(c) => setPaymentDetails({...paymentDetails, show: c})}
                        />
                     </div>
                     {paymentDetails.show && (
                         <div className="space-y-2 pl-6">
                             <input 
                               type="text" 
                               value={paymentDetails.phonePe} 
                               onChange={(e) => setPaymentDetails({...paymentDetails, phonePe: e.target.value})}
                               placeholder="PhonePe Number"
                               className="w-full px-2 py-1 text-sm rounded border border-input"
                             />
                             <input 
                               type="text" 
                               value={paymentDetails.googlePay} 
                               onChange={(e) => setPaymentDetails({...paymentDetails, googlePay: e.target.value})}
                               placeholder="Google Pay Number"
                               className="w-full px-2 py-1 text-sm rounded border border-input"
                             />
                             <input 
                               type="text" 
                               value={paymentDetails.upiId} 
                               onChange={(e) => setPaymentDetails({...paymentDetails, upiId: e.target.value})}
                               placeholder="UPI ID (e.g. name@okhdfcbank)"
                               className="w-full px-2 py-1 text-sm rounded border border-input"
                             />
                         </div>
                     )}
                 </div>
             </div>
          </div>
       </div>

       {/* RIGHT: PREVIEW SECTION */}
       <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border p-8 overflow-y-auto flex flex-col items-center relative">
           <div className="absolute top-4 right-4 flex gap-3 z-10 print:hidden">
              <button 
                 onClick={handleDownload}
                 className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
              >
                  <Download className="w-4 h-4" /> Download PDF
              </button>
              <button 
                 onClick={handlePrint}
                 className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium shadow-lg hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
              >
                  <Printer className="w-4 h-4" /> Print
              </button>
           </div>
           
           {/* The Invoice Paper (Scaled for view if needed, but simple scrolling is best) */}
           <div className="shadow-2xl print:shadow-none origin-top transform scale-[0.65] md:scale-[0.75] xl:scale-[0.8] mt-12">
              <InvoiceTemplate data={templateData} />
           </div>

           {/* Hidden Invoice for Print/Download PDF */}
           <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                <InvoiceTemplate ref={componentRef} data={templateData} />
           </div>
       </div>
    </div>
  )
}

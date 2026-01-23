import React, { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle, Copy, ExternalLink, QrCode } from 'lucide-react';

export function PaymentModal({ isOpen, onClose, plan }) {
  const [method, setMethod] = useState('upi'); // 'upi' | 'razorpay'
  const [step, setStep] = useState('select'); // 'select' | 'processing' | 'success'

  if (!isOpen || !plan) return null;

  const handleCopyVpa = () => {
    navigator.clipboard.writeText('business@upi');
    alert('VPA copied to clipboard!');
  };

  const handleRazorpayPayment = () => {
      setStep('processing');
      // Simulate Razorpay SDK load
      setTimeout(() => {
          setStep('success');
      }, 2000);
  };

  const handleUPIPaymentSent = () => {
      // In a real app, we'd ask for a Transaction ID here
      setStep('success');
  };

  if (step === 'success') {
      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-8 text-center border border-border animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground mb-6">
                    Your request to upgrade to <strong>{plan.name}</strong> has been received. 
                    {method === 'upi' ? " We will verify the transaction and update your plan shortly." : " Your plan is now active."}
                </p>
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                    Continue to Dashboard
                </button>
            </div>
        </div>
      )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
            <div>
                <h3 className="font-bold text-lg">Upgrade to {plan.name}</h3>
                <p className="text-sm text-muted-foreground">Total: <span className="text-foreground font-mono font-bold">{plan.price}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
            </button>
        </div>

        {/* Content */}
        <div className="p-0 flex-1 overflow-y-auto">
            
            {/* Payment Method Tabs */}
            <div className="flex border-b border-border">
                <button 
                  onClick={() => setMethod('upi')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${method === 'upi' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
                >
                    <QrCode className="w-4 h-4" /> UPI (Scan & Pay)
                </button>
                <button 
                  onClick={() => setMethod('razorpay')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${method === 'razorpay' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
                >
                    <CreditCard className="w-4 h-4" /> Razorpay / Card
                </button>
            </div>

            <div className="p-6">
                {method === 'upi' ? (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-border w-fit mx-auto shadow-sm">
                            {/* Placeholder for actual QR */}
                            <div className="w-48 h-48 bg-gray-100 flex flex-col items-center justify-center text-center p-4">
                                <QrCode className="w-12 h-12 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-500">Business UPI QR Code</span>
                            </div>
                        </div>
                        
                        <div className="text-center space-y-2">
                             <p className="text-sm font-medium">Scan with any UPI App</p>
                             <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span>
                             </div>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-xl flex items-center justify-between border border-border">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">UPI ID (VPA)</p>
                                <p className="font-mono font-medium">business@upi</p>
                            </div>
                            <button onClick={handleCopyVpa} className="p-2 hover:bg-background rounded-lg text-primary transition-colors">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col gap-3">
                           <div className="p-4 border border-border rounded-xl flex items-center gap-4 bg-card hover:border-primary/50 transition-colors cursor-pointer">
                              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600">
                                  <CreditCard className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                  <p className="font-medium">Credit / Debit Card</p>
                                  <p className="text-xs text-muted-foreground">Visa, Mastercard, Rupay</p>
                              </div>
                           </div>
                           <div className="p-4 border border-border rounded-xl flex items-center gap-4 bg-card hover:border-primary/50 transition-colors cursor-pointer">
                              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600">
                                  <Smartphone className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                  <p className="font-medium">Netbanking / Wallet</p>
                                  <p className="text-xs text-muted-foreground">All major banks supported</p>
                              </div>
                           </div>
                        </div>

                        <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Secured by Razorpay</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-muted/30">
            {method === 'upi' ? (
                <button 
                  onClick={handleUPIPaymentSent}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                    I have made the payment
                </button>
            ) : (
                <button 
                  onClick={handleRazorpayPayment}
                  disabled={step === 'processing'}
                  className="w-full py-3 bg-[#3399cc] text-white rounded-xl font-bold shadow-lg hover:bg-[#2e88b5] transition-all flex items-center justify-center gap-2"
                >
                    {step === 'processing' ? 'Processing...' : `Pay ${plan.price} via Razorpay`}
                </button>
            )}
        </div>
      </div>
    </div>
  );
}

// Icon helper
function ShieldCheck({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
    )
}

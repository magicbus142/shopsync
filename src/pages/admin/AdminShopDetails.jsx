import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  ExternalLink,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';

export function AdminShopDetails({ shop, isOpen, onClose, onUpdatePlan }) {
  if (!shop) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-background shadow-2xl border-l border-border transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
             <div>
                <h2 className="text-xl font-bold">{shop.org_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        shop.plan_key === 'free' 
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                        {shop.plan_key === 'free' ? 'Free Experience' : 'Plus Plan'}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-xs text-muted-foreground">ID: {shop.org_id.slice(0, 8)}...</span>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
             </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
             {/* Owner Info */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Owner Details</h3>
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {shop.owner_email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                         <p className="font-medium">{shop.owner_email}</p>
                         <p className="text-xs text-muted-foreground">Main Administrator</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <a href={`mailto:${shop.owner_email}`} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                         <Mail className="w-4 h-4" /> Send Email
                      </a>
                   </div>
                </div>
             </div>

             {/* Usage Stats */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Usage</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-muted/50 p-4 rounded-xl border border-border">
                      <p className="text-xs text-muted-foreground">Products</p>
                      <p className="text-2xl font-bold mt-1">{shop.product_count}</p>
                      <div className="w-full bg-muted h-1.5 mt-3 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-green-500" 
                           style={{ width: `${Math.min((shop.product_count / (shop.plan_key === 'free' ? 50 : 100)) * 100, 100)}%` }}
                         />
                      </div>
                   </div>
                   <div className="bg-muted/50 p-4 rounded-xl border border-border">
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="text-2xl font-bold mt-1">{shop.transaction_count}</p>
                      <div className="w-full bg-muted h-1.5 mt-3 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-purple-500" 
                           style={{ width: `${Math.min((shop.transaction_count / (shop.plan_key === 'free' ? 50 : 100)) * 100, 100)}%` }}
                         />
                      </div>
                   </div>
                </div>
             </div>

             {/* Subscription Management */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subscription</h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                   <div className={`p-4 border-b border-border flex items-center justify-between ${shop.plan_key !== 'free' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <div className="flex items-center gap-2">
                         {shop.plan_key !== 'free' ? <CheckCircle className="w-5 h-5 text-blue-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                         <span className="font-medium">{shop.plan_key === 'free' ? 'Free Plan' : 'Plus Plan'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Active</span>
                   </div>
                   <div className="p-4 bg-muted/20">
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Change Plan</label>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => onUpdatePlan(shop.org_id, 'free')}
                           disabled={shop.plan_key === 'free'}
                           className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                             shop.plan_key === 'free' 
                               ? 'bg-background border border-border shadow-sm text-foreground' 
                               : 'bg-transparent text-muted-foreground hover:bg-background hover:shadow-sm'
                           }`}
                         >
                            Free
                         </button>
                         <button 
                           onClick={() => onUpdatePlan(shop.org_id, 'plus')}
                           disabled={shop.plan_key === 'plus'}
                           className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                             shop.plan_key === 'plus' 
                               ? 'bg-blue-600 text-white shadow-md' 
                               : 'bg-transparent text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20'
                           }`}
                         >
                            Plus
                         </button>
                      </div>
                   </div>
                </div>
             </div>

             {/* Danger Zone */}
             <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider">Danger Zone</h3>
                <button className="w-full flex items-center justify-center gap-2 py-3 border border-destructive/20 rounded-xl text-destructive hover:bg-destructive hover:text-white transition-all font-medium">
                   <Ban className="w-4 h-4" /> Suspend Organization
                </button>
             </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-card/50 text-xs text-muted-foreground text-center">
             Joined on {format(new Date(shop.created_at), 'PPP')}
          </div>
        </div>
      </div>
    </>
  );
}

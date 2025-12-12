import React from 'react'
import { X } from 'lucide-react'

export default function DateRangePicker({ from, to, onFromChange, onToChange, onClear }) {
  return (
    <div className="flex flex-row gap-2 items-end">
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
        <input 
          type="date" 
          value={from || ''}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
        <input 
          type="date" 
          value={to || ''}
          onChange={(e) => onToChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
      </div>
      {(from || to) && onClear && (
        <button 
          onClick={onClear}
          className="mb-[5px] p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          title="Clear Dates"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

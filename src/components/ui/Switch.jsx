import React from 'react'

export default function Switch({ checked, onChange, label, className = '' }) {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
      <input 
        type="checkbox" 
        className="absolute top-0 left-0 w-0 h-0 opacity-0 peer" 
        checked={checked} 
        onChange={(e) => onChange && onChange(e.target.checked)}
      />
      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
      {label && <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300 select-none">{label}</span>}
    </label>
  )
}

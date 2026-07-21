import React from 'react'
import { useTheme, themes } from '../../context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2 bg-secondary/10 p-1 rounded-full border border-border">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            theme === t.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-secondary/20 text-muted-foreground'
          }`}
          title={t.name}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

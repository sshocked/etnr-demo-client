import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Archive, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { to: '/documents', icon: FileText, label: 'Документы' },
  { to: '/archive', icon: Archive, label: 'Архив' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 pb-safe" role="navigation" aria-label="Основная навигация">
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-full px-2 transition-all duration-200 active:scale-90',
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200',
                  isActive && 'bg-brand-100 dark:bg-brand-900/40 scale-105',
                )}>
                  <Icon className={cn('h-[22px] w-[22px]', isActive && 'stroke-[2.5]')} />
                </div>
                <span className={cn('text-[11px]', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

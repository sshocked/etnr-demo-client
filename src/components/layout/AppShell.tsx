import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import BurgerMenu from './BurgerMenu'
import DemoBadge from './DemoBadge'
import OfflineBanner from './OfflineBanner'
import { getItem } from '../../lib/storage'
import { STORAGE_KEYS } from '../../lib/constants'
import type { UserProfile, Subscription } from '../../lib/constants'

const titles: Record<string, string> = {
  '/dashboard': 'Главная',
  '/documents': 'Документы',
  '/archive': 'Архив',
  '/settings': 'Настройки',
  '/profile': 'Профиль',
  '/profile/payment': 'Оплата',
  '/profile/edo': 'Операторы ЭДО',
  '/faq': 'Помощь и FAQ',
  '/notifications': 'Уведомления',
  '/stats': 'Статистика',
  '/scan': 'Сканер QR',
  '/support': 'Поддержка',
}

const mainRoutes = ['/dashboard', '/documents', '/archive', '/settings']
const navRoutes = ['/dashboard', '/documents', '/archive', '/settings', '/profile']

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const user = getItem<UserProfile>(STORAGE_KEYS.USER)
  const subscription = getItem<Subscription>(STORAGE_KEYS.SUBSCRIPTION)

  const isMainRoute = mainRoutes.includes(location.pathname)
  const title = titles[location.pathname] || 'eTRN'

  // For detail pages, derive title
  const isDocDetail = location.pathname.match(/^\/documents\/[^/]+$/) && !location.pathname.includes('bulk-sign')
  const isSignFlow = location.pathname.match(/^\/documents\/[^/]+\/sign$/)
  const isBulkSign = location.pathname === '/documents/bulk-sign'
  const isArchiveDetail = location.pathname.match(/^\/archive\/[^/]+$/)

  const pageTitle = isBulkSign ? 'Подписание' : isDocDetail ? 'Документ' : isSignFlow ? 'Подписание' : isArchiveDetail ? 'Документ' : title
  const showBack = !isMainRoute
  const showBottomNav = navRoutes.includes(location.pathname)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} subscription={subscription} />
      <TopBar title={pageTitle} showBack={showBack} onMenuClick={() => setMenuOpen(true)} />
      <DemoBadge />
      <OfflineBanner />
      <main className={`flex-1 ${showBottomNav ? 'pb-20' : 'pb-4'}`}>
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}

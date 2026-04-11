import { Navigate, useLocation } from 'react-router-dom'
import { getAuth, getItem } from '../lib/storage'
import { STORAGE_KEYS } from '../lib/constants'
import type { UserProfile } from '../lib/constants'

/**
 * Protects routes: redirects to / if not authenticated,
 * or to /onboarding if onboarding not completed.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const auth = getAuth()
  const user = getItem<UserProfile>(STORAGE_KEYS.USER)

  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (user && !user.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

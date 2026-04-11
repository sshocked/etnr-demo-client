import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/ui/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { getSettings } from './lib/storage'

export default function App() {
  useEffect(() => {
    const { darkMode } = getSettings()
    document.documentElement.classList.toggle('dark', darkMode)
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  )
}

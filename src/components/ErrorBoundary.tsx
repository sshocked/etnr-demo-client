import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.hash = '#/dashboard'
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Что-то пошло не так</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            Произошла ошибка в приложении. Попробуйте перезагрузить страницу.
          </p>
          <div className="w-full max-w-xs space-y-3">
            <Button fullWidth onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4" />
              Перезагрузить
            </Button>
            <Button fullWidth variant="secondary" onClick={this.handleGoHome}>
              На главную
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

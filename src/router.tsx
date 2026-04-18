import { createHashRouter } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import AuthGuard from './components/AuthGuard'
import WelcomePage from './pages/WelcomePage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import DocumentListPage from './pages/DocumentListPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import SigningFlowPage from './pages/SigningFlowPage'
import ArchivePage from './pages/ArchivePage'
import ArchiveDetailPage from './pages/ArchiveDetailPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import PaymentPage from './pages/PaymentPage'
import EdoConnectPage from './pages/EdoConnectPage'
import McdLandingPage from './pages/McdLandingPage'
import McdInvitePage from './pages/McdInvitePage'
import CertIssuancePage from './pages/CertIssuancePage'
import PinSetupPage from './pages/PinSetupPage'
import PinLoginPage from './pages/PinLoginPage'
import FaqPage from './pages/FaqPage'
import NotificationsPage from './pages/NotificationsPage'
import StatsPage from './pages/StatsPage'
import QrScannerPage from './pages/QrScannerPage'
import SupportChatPage from './pages/SupportChatPage'
import BulkSigningPage from './pages/BulkSigningPage'

export const router = createHashRouter([
  // Public routes
  { path: '/', element: <WelcomePage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/pin-setup', element: <PinSetupPage /> },
  { path: '/pin-login', element: <PinLoginPage /> },
  { path: '/onboarding', element: <AuthGuard><OnboardingPage /></AuthGuard> },
  { path: '/mcd', element: <McdLandingPage /> },
  { path: '/mcd/invite', element: <McdInvitePage /> },
  { path: '/cert-issue', element: <CertIssuancePage /> },
  // Protected routes (require auth + onboarding)
  {
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/documents', element: <DocumentListPage /> },
      { path: '/documents/bulk-sign', element: <BulkSigningPage /> },
      { path: '/documents/:id', element: <DocumentDetailPage /> },
      { path: '/documents/:id/sign', element: <SigningFlowPage /> },
      { path: '/archive', element: <ArchivePage /> },
      { path: '/archive/:id', element: <ArchiveDetailPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/payment', element: <PaymentPage /> },
      { path: '/profile/edo', element: <EdoConnectPage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/stats', element: <StatsPage /> },
      { path: '/scan', element: <QrScannerPage /> },
      { path: '/support', element: <SupportChatPage /> },
    ],
  },
])

import type { Subscription } from './constants'

export interface BillingStatusResponse {
  package?: {
    status: string
    start_at?: string
    end_at?: string
    signature_limit?: number
    signatures_used?: number
    signatures_remaining?: number
  }
  latest_invoice?: {
    id: string
    status: string
    amount: number
    currency: string
    payment_url?: string
    created_at: string
  }
}

export function mapBillingStatusToSubscription(
  billing: BillingStatusResponse,
  companyName?: string,
  companyInn?: string,
): Subscription | null {
  const currentPackage = billing.package
  if (!currentPackage || currentPackage.status === 'none') {
    return null
  }

  const used = currentPackage.signatures_used ?? 0
  const limit = currentPackage.signature_limit ?? null

  return {
    companyName: companyName || 'Подписка',
    companyInn: companyInn || '—',
    status: currentPackage.status as Subscription['status'],
    periodFrom: currentPackage.start_at ?? '',
    periodTo: currentPackage.end_at ?? '',
    plan: 'Basic',
    used,
    limit,
  }
}

import { api } from './api'

interface SignInitResponse {
  signRequestId: string
  nonce: string
  requiredDigest: string
  mcdId?: string
  mcdNumber?: string
  certificateId?: string
}

interface SignSubmitResponse {
  status: 'submitted'
}

function toBase64(value: string): string {
  return window.btoa(value)
}

export async function signDocument(documentId: string): Promise<void> {
  const init = await api.post<SignInitResponse>(`/documents/${documentId}/sign/init`, { mode: 'sign' })

  await api.post<SignSubmitResponse>(`/documents/${documentId}/sign/submit`, {
    signRequestId: init.signRequestId,
    signature: toBase64(init.requiredDigest),
  })
}

export async function refuseDocument(documentId: string, reason: string): Promise<void> {
  await api.post<void>(`/documents/${documentId}/refuse`, { reason })
}

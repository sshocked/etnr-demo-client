import { DOC_TYPE_LABELS, type DocRecord, type DocumentType, type EdoOperator, type FileAttachment, type HistoryEvent, DocumentStatus } from './constants'

export interface DocumentsListItemApi {
  id: string
  number: string
  type?: string | null
  status?: string | null
  senderInn?: string | null
  senderName?: string | null
  receiverInn?: string | null
  receiverName?: string | null
  updatedAt?: string | null
  createdAt?: string | null
  signedAt?: string | null
  edoOperator?: string | null
  hasAttachedMcd?: boolean | null
  requiresSign?: boolean | null
}

export interface DocumentsListResponse {
  items: DocumentsListItemApi[]
  nextCursor?: string | null
  totals?: Partial<Record<DocumentStatus, number>> | null
}

interface PartyApi {
  name?: string | null
  inn?: string | null
}

interface DriverApi {
  name?: string | null
  phone?: string | null
  vehiclePlate?: string | null
}

interface RouteApi {
  from?: string | null
  to?: string | null
}

interface CargoApi {
  description?: string | null
  weight?: number | null
  volume?: number | null
  packages?: number | null
}

interface GeoApi {
  lat?: number | null
  lng?: number | null
  address?: string | null
}

interface HistoryApi {
  id?: string | null
  action?: string | null
  description?: string | null
  actorName?: string | null
  createdAt?: string | null
  location?: GeoApi | null
}

interface FileApi {
  id?: string | null
  name?: string | null
  sizeBytes?: number | null
  mimeType?: string | null
  downloadUrl?: string | null
}

interface AssignedToApi {
  userId?: string | null
  name?: string | null
}

export interface DocumentDetailApi {
  id: string
  number: string
  type?: string | null
  status?: string | null
  requiresSign?: boolean | null
  sender?: PartyApi | null
  receiver?: PartyApi | null
  driver?: DriverApi | null
  route?: RouteApi | null
  cargo?: CargoApi | null
  amount?: number | null
  signLocation?: GeoApi | null
  reservations?: string | null
  files?: FileApi[] | null
  history?: HistoryApi[] | null
  createdAt?: string | null
  updatedAt?: string | null
  signedAt?: string | null
  edoOperator?: string | null
  assignedTo?: AssignedToApi | null
}

export interface DocumentCountsApi {
  needSign?: number
  inProgress?: number
  signed?: number
  signedWithReservations?: number
  refused?: number
  error?: number
  total?: number
}

function isDocumentStatus(value: string | null | undefined): value is DocumentStatus {
  return Boolean(value) && Object.values(DocumentStatus).includes(value as DocumentStatus)
}

function normalizeStatus(value: string | null | undefined, requiresSign?: boolean | null): DocumentStatus {
  if (isDocumentStatus(value)) return value
  if (requiresSign) return DocumentStatus.NEED_SIGN
  return DocumentStatus.IN_PROGRESS
}

function normalizeType(value: string | null | undefined): DocumentType {
  return value && value in DOC_TYPE_LABELS ? value as DocumentType : 'trn'
}

function normalizeEdoOperator(value: string | null | undefined): EdoOperator | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase()
  if (normalized === 'sbis' || normalized === 'sberkorus' || normalized === 'astral' || normalized === 'kontur') {
    return normalized
  }
  return undefined
}

function normalizeHistoryEvent(item: HistoryApi, index: number): HistoryEvent {
  const fallbackTimestamp = new Date(0).toISOString()
  const action = item.action

  return {
    id: item.id ?? `history-${index}`,
    timestamp: item.createdAt ?? fallbackTimestamp,
    action:
      action === 'created' || action === 'sent' || action === 'viewed' || action === 'signed' || action === 'rejected' || action === 'error'
        ? action
        : 'created',
    actor: item.actorName ?? 'Система',
    description: item.description ?? 'Изменение статуса документа',
    location: item.location?.lat != null && item.location?.lng != null
      ? {
        lat: item.location.lat,
        lng: item.location.lng,
        address: item.location.address ?? undefined,
      }
      : undefined,
  }
}

function normalizeFile(item: FileApi, index: number): FileAttachment {
  return {
    id: item.id ?? `file-${index}`,
    name: item.name ?? 'Файл',
    size: item.sizeBytes ?? 0,
    type: item.mimeType ?? 'application/octet-stream',
    downloadUrl: item.downloadUrl ?? undefined,
  }
}

function buildBaseDocRecord(params: {
  id: string
  number: string
  type?: string | null
  status?: string | null
  senderName?: string | null
  senderInn?: string | null
  receiverName?: string | null
  receiverInn?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  signedAt?: string | null
  edoOperator?: string | null
  requiresSign?: boolean | null
}): DocRecord {
  const updatedAt = params.updatedAt ?? params.createdAt ?? new Date().toISOString()
  const status = normalizeStatus(params.status, params.requiresSign)

  return {
    id: params.id,
    number: params.number,
    title: params.number,
    type: normalizeType(params.type),
    status,
    requiresSign: params.requiresSign ?? status === DocumentStatus.NEED_SIGN,
    createdAt: params.createdAt ?? updatedAt,
    updatedAt,
    signedAt: params.signedAt ?? null,
    sender: {
      name: params.senderName ?? 'Не указан',
      inn: params.senderInn ?? 'Не указан',
    },
    receiver: {
      name: params.receiverName ?? 'Не указан',
      inn: params.receiverInn ?? 'Не указан',
    },
    driver: {
      name: 'Не указан',
      phone: 'Не указан',
      vehiclePlate: 'Не указан',
    },
    route: {
      from: 'Не указан',
      to: 'Не указан',
    },
    cargo: {
      description: 'Нет данных',
      weight: 0,
      volume: 0,
      packages: 0,
    },
    amount: 0,
    history: [],
    files: [],
    edoOperator: normalizeEdoOperator(params.edoOperator),
  }
}

export function normalizeListDocument(item: DocumentsListItemApi): DocRecord {
  return buildBaseDocRecord({
    id: item.id,
    number: item.number,
    type: item.type,
    status: item.status,
    senderName: item.senderName,
    senderInn: item.senderInn,
    receiverName: item.receiverName,
    receiverInn: item.receiverInn,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    signedAt: item.signedAt,
    edoOperator: item.edoOperator,
    requiresSign: item.requiresSign,
  })
}

export function normalizeDetailDocument(item: DocumentDetailApi): DocRecord {
  const base = buildBaseDocRecord({
    id: item.id,
    number: item.number,
    type: item.type,
    status: item.status,
    senderName: item.sender?.name,
    senderInn: item.sender?.inn,
    receiverName: item.receiver?.name,
    receiverInn: item.receiver?.inn,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    signedAt: item.signedAt,
    edoOperator: item.edoOperator,
    requiresSign: item.requiresSign,
  })

  return {
    ...base,
    driver: {
      name: item.driver?.name ?? base.driver.name,
      phone: item.driver?.phone ?? base.driver.phone,
      vehiclePlate: item.driver?.vehiclePlate ?? base.driver.vehiclePlate,
    },
    route: {
      from: item.route?.from ?? base.route.from,
      to: item.route?.to ?? base.route.to,
    },
    cargo: {
      description: item.cargo?.description ?? base.cargo.description,
      weight: item.cargo?.weight ?? base.cargo.weight,
      volume: item.cargo?.volume ?? base.cargo.volume,
      packages: item.cargo?.packages ?? base.cargo.packages,
    },
    amount: item.amount ?? 0,
    signLocation: item.signLocation?.lat != null && item.signLocation?.lng != null
      ? {
        lat: item.signLocation.lat,
        lng: item.signLocation.lng,
        address: item.signLocation.address ?? undefined,
      }
      : undefined,
    reservations: item.reservations ?? undefined,
    files: (item.files ?? []).map(normalizeFile),
    history: (item.history ?? []).map(normalizeHistoryEvent),
    assignedTo: item.assignedTo?.name ?? undefined,
  }
}

export function normalizeCounts(counts: DocumentCountsApi | null | undefined): Record<DocumentStatus, number> {
  return {
    [DocumentStatus.NEED_SIGN]: counts?.needSign ?? 0,
    [DocumentStatus.IN_PROGRESS]: counts?.inProgress ?? 0,
    [DocumentStatus.SIGNED]: counts?.signed ?? 0,
    [DocumentStatus.SIGNED_WITH_RESERVATIONS]: counts?.signedWithReservations ?? 0,
    [DocumentStatus.REFUSED]: counts?.refused ?? 0,
    [DocumentStatus.ERROR]: counts?.error ?? 0,
  }
}

import type { ActivityLogEntry } from '../lib/constants'

export function seedActivity(): ActivityLogEntry[] {
  return [
    // doc-001 — NEED_SIGN
    { id: 'a1', timestamp: '2026-03-25T09:05:00Z', type: 'receive', documentId: 'doc-001', documentNumber: 'ЭТрН-2026-001', message: 'Получен новый документ от ООО "АгроТрейд"' },
    // doc-002 — NEED_SIGN
    { id: 'a2', timestamp: '2026-03-24T15:00:00Z', type: 'view', documentId: 'doc-002', documentNumber: 'ЭТрН-2026-002', message: 'Просмотрен документ ЭТрН-2026-002' },
    // doc-003 — NEED_SIGN
    { id: 'a3', timestamp: '2026-03-23T11:20:00Z', type: 'receive', documentId: 'doc-003', documentNumber: 'ЭТрН-2026-003', message: 'Получен документ ЭТрН-2026-003 от ООО "ТехноПарк"' },
    // doc-004 — NEED_SIGN
    { id: 'a4', timestamp: '2026-03-22T16:30:00Z', type: 'receive', documentId: 'doc-004', documentNumber: 'ЭТрН-2026-004', message: 'Получен документ ЭТрН-2026-004 от ООО "ЛогистикПро"' },
    // doc-005 — NEED_SIGN
    { id: 'a5', timestamp: '2026-03-21T09:15:00Z', type: 'receive', documentId: 'doc-005', documentNumber: 'ЭТрН-2026-005', message: 'Получен документ ЭТрН-2026-005 от ООО "ГазТранс"' },
    // doc-006 — IN_PROGRESS
    { id: 'a6', timestamp: '2026-03-21T10:00:00Z', type: 'view', documentId: 'doc-006', documentNumber: 'ЭТрН-2026-006', message: 'Документ ЭТрН-2026-006 на рассмотрении у получателя' },
    // doc-007 — IN_PROGRESS
    { id: 'a7', timestamp: '2026-03-19T14:00:00Z', type: 'sign', documentId: 'doc-007', documentNumber: 'ЭТрН-2026-007', message: 'Документ ЭТрН-2026-007 подписан водителем' },
    // doc-008 — IN_PROGRESS
    { id: 'a8', timestamp: '2026-03-17T16:00:00Z', type: 'view', documentId: 'doc-008', documentNumber: 'ЭТрН-2026-008', message: 'ЭТрН-2026-008 ожидает проверки документов' },
    // doc-009 — IN_PROGRESS
    { id: 'a9', timestamp: '2026-03-14T12:00:00Z', type: 'sign', documentId: 'doc-009', documentNumber: 'ЭТрН-2026-009', message: 'Документ ЭТрН-2026-009 подписан одной стороной' },
    // doc-018 — ERROR
    { id: 'a10', timestamp: '2026-03-20T10:00:00Z', type: 'error', documentId: 'doc-018', documentNumber: 'ЭТрН-2026-018', message: 'Ошибка подписания ЭТрН-2026-018' },
    // doc-010 — SIGNED
    { id: 'a11', timestamp: '2026-03-07T14:00:00Z', type: 'sign', documentId: 'doc-010', documentNumber: 'ЭТрН-2026-010', message: 'Документ ЭТрН-2026-010 подписан' },
    // doc-011 — SIGNED
    { id: 'a12', timestamp: '2026-03-04T11:00:00Z', type: 'sign', documentId: 'doc-011', documentNumber: 'ЭТрН-2026-011', message: 'Документ ЭТрН-2026-011 подписан' },
    // doc-012 — SIGNED
    { id: 'a13', timestamp: '2026-02-27T16:00:00Z', type: 'sign', documentId: 'doc-012', documentNumber: 'ЭТрН-2026-012', message: 'Документ ЭТрН-2026-012 подписан всеми сторонами' },
    // doc-013 — SIGNED
    { id: 'a14', timestamp: '2026-02-24T09:00:00Z', type: 'sign', documentId: 'doc-013', documentNumber: 'ЭТрН-2026-013', message: 'Документ ЭТрН-2026-013 подписан получателем' },
    // doc-014 — SIGNED
    { id: 'a15', timestamp: '2026-02-18T15:00:00Z', type: 'sign', documentId: 'doc-014', documentNumber: 'ЭТрН-2026-014', message: 'Документ ЭТрН-2026-014 подписан' },
    // doc-015 — SIGNED
    { id: 'a16', timestamp: '2026-02-14T12:00:00Z', type: 'sign', documentId: 'doc-015', documentNumber: 'ЭТрН-2026-015', message: 'Документ ЭТрН-2026-015 подписан всеми сторонами' },
    // doc-016 — SIGNED
    { id: 'a17', timestamp: '2026-02-07T17:00:00Z', type: 'sign', documentId: 'doc-016', documentNumber: 'ЭТрН-2026-016', message: 'Документ ЭТрН-2026-016 подписан обеими сторонами' },
    // doc-017 — SIGNED
    { id: 'a18', timestamp: '2026-01-29T18:00:00Z', type: 'sign', documentId: 'doc-017', documentNumber: 'ЭТрН-2026-017', message: 'Документ ЭТрН-2026-017 подписан' },
  ]
}

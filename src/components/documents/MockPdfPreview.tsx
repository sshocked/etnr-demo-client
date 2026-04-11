import type { DocRecord } from '../../lib/constants'
import { DOC_TYPE_LABELS, DocumentStatus } from '../../lib/constants'
import { formatDate, formatMoney } from '../../lib/utils'

interface MockPdfPreviewProps {
  doc: DocRecord
}

export default function MockPdfPreview({ doc }: MockPdfPreviewProps) {
  const isSigned =
    doc.status === DocumentStatus.SIGNED ||
    doc.status === DocumentStatus.SIGNED_WITH_RESERVATIONS

  return (
    <div className="overflow-auto -mx-4 px-4">
      <div className="min-w-[360px] bg-white border border-gray-300 shadow-md rounded-sm mx-auto max-w-[420px]">
        {/* Page content */}
        <div className="p-5 space-y-4 relative">
          {/* Signed stamp overlay */}
          {isSigned && (
            <div className="absolute top-16 right-6 rotate-[-18deg] pointer-events-none select-none">
              <div className="border-4 border-green-600 rounded-md px-4 py-2 opacity-30">
                <span className="text-green-600 font-bold text-2xl tracking-widest">
                  {doc.status === DocumentStatus.SIGNED_WITH_RESERVATIONS
                    ? 'С ОГОВОРКОЙ'
                    : 'ПОДПИСАН'}
                </span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center border-b border-gray-400 pb-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Электронный документ
            </p>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {DOC_TYPE_LABELS[doc.type]}
            </h3>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-600">
              <span className="font-mono">{doc.number}</span>
              <span className="text-gray-300">|</span>
              <span>от {formatDate(doc.createdAt)}</span>
            </div>
          </div>

          {/* Section 1 - Sender */}
          <div className="border border-gray-200 rounded-sm">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-700">
                1. Грузоотправитель
              </span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              <p className="text-xs text-gray-800">{doc.sender.name}</p>
              <p className="text-[11px] text-gray-500 font-mono">
                ИНН {doc.sender.inn}
              </p>
            </div>
          </div>

          {/* Section 2 - Receiver */}
          <div className="border border-gray-200 rounded-sm">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-700">
                2. Грузополучатель
              </span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              <p className="text-xs text-gray-800">{doc.receiver.name}</p>
              <p className="text-[11px] text-gray-500 font-mono">
                ИНН {doc.receiver.inn}
              </p>
            </div>
          </div>

          {/* Section 3 - Cargo */}
          <div className="border border-gray-200 rounded-sm">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-700">
                3. Груз
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs text-gray-800 mb-1.5">
                {doc.cargo.description}
              </p>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400 block">Масса</span>
                  <span className="text-gray-700 font-mono">
                    {doc.cargo.weight.toLocaleString('ru')} кг
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Объём</span>
                  <span className="text-gray-700 font-mono">
                    {doc.cargo.volume} м&sup3;
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Мест</span>
                  <span className="text-gray-700 font-mono">
                    {doc.cargo.packages}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 - Route */}
          <div className="border border-gray-200 rounded-sm">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-700">
                4. Маршрут
              </span>
            </div>
            <div className="px-3 py-2 flex items-center gap-2 text-xs text-gray-800">
              <span>{doc.route.from}</span>
              <span className="text-gray-400">&rarr;</span>
              <span>{doc.route.to}</span>
            </div>
          </div>

          {/* Section 5 - Driver */}
          <div className="border border-gray-200 rounded-sm">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-700">
                5. Водитель
              </span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              <p className="text-xs text-gray-800">{doc.driver.name}</p>
              <p className="text-[11px] text-gray-500 font-mono">
                ТС: {doc.driver.vehiclePlate}
              </p>
            </div>
          </div>

          {/* Section 6 - Cost */}
          <div className="border border-gray-200 rounded-sm">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-700">
                6. Стоимость
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-gray-900 font-mono">
                {formatMoney(doc.amount)}
              </p>
            </div>
          </div>

          {/* Signature area */}
          <div className="border-t border-gray-300 pt-3 mt-4">
            {isSigned ? (
              <div className="text-center">
                <p className="text-[11px] text-green-700 font-semibold mb-1">
                  Документ подписан электронной подписью
                </p>
                {doc.signedAt && (
                  <p className="text-[10px] text-gray-400 font-mono">
                    Дата подписания: {formatDate(doc.signedAt)}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-[11px] text-gray-500">Место для подписи</p>
                <div className="border-b border-dotted border-gray-400 w-48 mx-auto" />
                <p className="text-[10px] text-gray-400">(подпись / ЭП)</p>
              </div>
            )}
          </div>

          {/* Page number */}
          <div className="text-center pt-2">
            <span className="text-[10px] text-gray-400">Стр. 1 из 1</span>
          </div>
        </div>
      </div>
    </div>
  )
}

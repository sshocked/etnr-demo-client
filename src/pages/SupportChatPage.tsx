import { useState, useRef, useEffect } from 'react'
import { Send, Phone, MessageCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  text: string
  sender: 'bot' | 'user'
}

const QUICK_REPLIES = [
  'Проблема с подписью',
  'Вопрос по МЧД',
  'Оплата',
  'Другое',
] as const

const BOT_RESPONSES: Record<string, string> = {
  'Проблема с подписью':
    'Убедитесь, что сертификат УКЭП активен и МЧД привязана. Если проблема сохраняется, обратитесь: 8-800-100-20-30',
  'Вопрос по МЧД':
    'МЧД можно загрузить в разделе Профиль. Для получения МЧД обратитесь в вашу компанию или нажмите «Отправить ссылку на загрузку МЧД» в профиле.',
  'Оплата':
    'Оплатить подписку можно в разделе Профиль → Оплата. Доступна оплата картой и через СБП.',
  'Другое':
    'Опишите вашу проблему, и мы свяжемся с вами. Или позвоните: 8-800-100-20-30',
}

const FREE_TEXT_RESPONSE =
  'Спасибо! Мы передали ваш вопрос специалисту. Ответ придёт в течение 15 минут.'

let msgId = 0
function nextId() {
  return `msg-${++msgId}`
}

export default function SupportChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), text: 'Здравствуйте! Я виртуальный помощник eTRN. Чем могу помочь?', sender: 'bot' },
    { id: nextId(), text: 'Выберите тему обращения:', sender: 'bot' },
  ])
  const [input, setInput] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  const addBotMessage = (text: string, delay: number) => {
    setIsTyping(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { id: nextId(), text, sender: 'bot' }])
      setIsTyping(false)
      setShowQuickReplies(true)
    }, delay)
  }

  const handleQuickReply = (reply: string) => {
    setShowQuickReplies(false)
    setMessages(prev => [...prev, { id: nextId(), text: reply, sender: 'user' }])
    const response = BOT_RESPONSES[reply]
    if (response) {
      addBotMessage(response, 1000)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setShowQuickReplies(false)
    setMessages(prev => [...prev, { id: nextId(), text, sender: 'user' }])
    addBotMessage(FREE_TEXT_RESPONSE, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-brand-600 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Quick replies */}
        {showQuickReplies && !isTyping && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_REPLIES.map(reply => (
              <button
                key={reply}
                onClick={() => handleQuickReply(reply)}
                className="px-4 py-2.5 rounded-full border-2 border-brand-200 text-brand-700 text-sm font-medium bg-white dark:bg-gray-900 hover:bg-brand-50 dark:hover:bg-brand-900/30 active:bg-brand-100 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* External links */}
      <div className="flex items-center justify-center gap-6 py-2 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
        <a
          href="https://t.me/etrn_support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          @etrn_support
        </a>
        <a
          href="tel:88001002030"
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          8-800-100-20-30
        </a>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-sm dark:text-gray-100 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white disabled:opacity-40 active:bg-brand-700 transition-colors shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

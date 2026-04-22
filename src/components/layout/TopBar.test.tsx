import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import TopBar from './TopBar'
import { renderWithRouter } from '../../test/helpers'

describe('TopBar', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает заголовок', () => {
    renderWithRouter(<TopBar title="Главная" />)
    expect(screen.getByText('Главная')).toBeInTheDocument()
  })

  it('показывает кнопку «Меню» когда нет showBack', () => {
    renderWithRouter(<TopBar title="Главная" />)
    expect(screen.getByLabelText('Меню')).toBeInTheDocument()
    expect(screen.queryByLabelText('Назад')).not.toBeInTheDocument()
  })

  it('показывает кнопку «Назад» при showBack=true', () => {
    renderWithRouter(<TopBar title="Детали" showBack />)
    expect(screen.getByLabelText('Назад')).toBeInTheDocument()
    expect(screen.queryByLabelText('Меню')).not.toBeInTheDocument()
  })

  it('вызывает onMenuClick при клике на «Меню»', () => {
    const onMenuClick = vi.fn()
    renderWithRouter(<TopBar title="Главная" onMenuClick={onMenuClick} />)
    fireEvent.click(screen.getByLabelText('Меню'))
    expect(onMenuClick).toHaveBeenCalled()
  })

  it('показывает кнопки Уведомлений и Профиля', () => {
    renderWithRouter(<TopBar title="Главная" />)
    expect(screen.getByLabelText('Уведомления')).toBeInTheDocument()
    expect(screen.getByLabelText('Профиль')).toBeInTheDocument()
  })

  it('не теряет кликабельность Menu-кнопки при длинном заголовке', () => {
    const longTitle = 'Очень Длинный Заголовок Страницы Который Должен Быть Обрезан Truncate'
    const onMenuClick = vi.fn()
    renderWithRouter(<TopBar title={longTitle} onMenuClick={onMenuClick} />)
    const menuBtn = screen.getByLabelText('Меню')
    // Кнопка существует и кликабельна
    expect(menuBtn).toBeInTheDocument()
    fireEvent.click(menuBtn)
    expect(onMenuClick).toHaveBeenCalled()
  })

  it('показывает счётчик непрочитанных уведомлений', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ count: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderWithRouter(<TopBar title="Главная" />)
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})

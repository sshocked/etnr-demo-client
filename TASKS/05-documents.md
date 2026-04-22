# Task 05 — Documents (после бэкенда Task 05)

## Бэкенд endpoints
- `GET /documents?status=&cursor=&search=` → `{items[], nextCursor, totals}`
- `GET /documents/:id` → полный объект документа с files, history
- `GET /documents/counts` → `{NEED_SIGN, IN_PROGRESS, SIGNED, ...}`
- `POST /documents/:id/export` → `{downloadUrl}`
- `POST /documents/:id/assign` → `204`
- `POST /documents/:id/view` → `204`

## Что изменить

### src/pages/DocumentsPage.tsx
Убрать mock mockDocuments. Загружать через api.get('/documents', {status, cursor}).
Реализовать infinite scroll через cursor.

### src/pages/DocumentDetailPage.tsx (или /documents/:id)
Загружать: `api.get('/documents/' + id)`.
Кнопка Экспорт: `api.post('/documents/' + id + '/export')` → открыть downloadUrl.

### src/pages/ArchivePage.tsx
`api.get('/documents', {status: 'SIGNED,REFUSED'})`.

### src/components/layout/Header.tsx или Dashboard
Счётчики: `api.get('/documents/counts')`.

## Проверка
1. /documents → список из БД (вставить тестовый документ через psql)
2. /documents/:id → детальная страница
3. Счётчики на дашборде обновляются

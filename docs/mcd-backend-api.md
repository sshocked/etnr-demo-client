# МЧД — техническое задание для бэкенда

**Версия:** 1.0
**Дата:** 2026-04-19
**Для:** бэкенд-разработчик

Документ описывает API и схему данных для модуля «Машиночитаемая доверенность» (МЧД) в приложении **eTRN**. Основан на прототипе: https://aleksaletin.github.io/etrn/

Связанные документы:
- `docs/mcd-spec-v2.md` — бизнес-логика и сценарии
- `docs/samples/` — реальные примеры XML-МЧД для парсинга

---

## 1. Схема БД

### 1.1 Таблица `mcd`

```sql
CREATE TABLE mcd (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),       -- владелец (доверенное лицо)
  status              mcd_status NOT NULL DEFAULT 'pending_verification',
  number              TEXT NOT NULL,                             -- номер МЧД из XML
  principal_inn       VARCHAR(12) NOT NULL,                      -- ИНН доверителя
  principal_name      TEXT NOT NULL,                             -- Название доверителя
  principal_ogrn      VARCHAR(15),
  principal_kpp       VARCHAR(9),
  trusted_person      TEXT NOT NULL,                             -- ФИО доверенного
  trusted_inn         VARCHAR(12),
  trusted_snils       VARCHAR(14),
  valid_from          DATE NOT NULL,
  valid_until         DATE NOT NULL,
  file_url            TEXT NOT NULL,                             -- ссылка на XML в S3
  file_hash_sha256    VARCHAR(64) NOT NULL,                      -- дедупликация загрузок
  registry_guid       UUID,                                      -- guid в реестре ФНС
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at         TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  created_from_invite UUID REFERENCES mcd_invite(id),            -- если загружена по инвайту
  UNIQUE (user_id, principal_inn, number)                        -- защита от дублей
);

CREATE TYPE mcd_status AS ENUM (
  'pending_verification',  -- загружена, проверка в процессе
  'linked',                -- валидна и активна
  'expired',               -- истёк срок
  'invalid',               -- провалена верификация (плохой формат/подпись)
  'revoked',               -- отозвана доверителем через реестр ФНС
  'insufficient'           -- не хватает полномочий для нужных действий
);

CREATE INDEX idx_mcd_user ON mcd(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_mcd_principal ON mcd(principal_inn) WHERE status = 'linked';
```

### 1.2 Таблица `mcd_power` (полномочия)

```sql
CREATE TABLE mcd_power (
  mcd_id         UUID NOT NULL REFERENCES mcd(id) ON DELETE CASCADE,
  code           VARCHAR(64) NOT NULL,                -- ведомственный код ЕКП
  name           TEXT NOT NULL,                        -- наименование из XML
  constraints    JSONB,                                -- доп. условия (сумма, период, контрагенты)
  PRIMARY KEY (mcd_id, code)
);

CREATE INDEX idx_mcd_power_code ON mcd_power(code);
```

Коды полномочий — **строковые идентификаторы** формата `{ВЕДОМСТВО}_{ПОДСИСТЕМА}_{КОД}`, примеры:
- `BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS8` — «Подписывать транспортные накладные»
- `BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS7` — «Подписывать товарно-транспортные накладные»
- `FAS_EIAS_MA0001` — «Подписывать отчётные формы ФГИС ЕИАС»

Полный список кодов подтягивается с `m4d.nalog.gov.ru` или от аккредитованного УЦ.

### 1.3 Таблица `mcd_invite` (invite-ссылки)

```sql
CREATE TABLE mcd_invite (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id   UUID NOT NULL REFERENCES users(id),
  token_hash        VARCHAR(64) NOT NULL UNIQUE,      -- SHA-256 от токена, сам токен не храним
  recipient_name    TEXT NOT NULL,
  recipient_contact TEXT NOT NULL,                    -- phone E.164 или email
  channel           invite_channel NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  one_time          BOOLEAN NOT NULL DEFAULT TRUE,
  consumed_at       TIMESTAMPTZ,
  consumed_mcd_id   UUID REFERENCES mcd(id),
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata          JSONB                             -- IP, user-agent при создании, для audit
);

CREATE TYPE invite_channel AS ENUM ('sms', 'email', 'copy');

CREATE INDEX idx_invite_hash ON mcd_invite(token_hash);
CREATE INDEX idx_invite_inviter_active ON mcd_invite(inviter_user_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
```

### 1.4 Таблица `mcd_audit_log`

```sql
CREATE TABLE mcd_audit_log (
  id             BIGSERIAL PRIMARY KEY,
  mcd_id         UUID REFERENCES mcd(id),
  invite_id      UUID REFERENCES mcd_invite(id),
  user_id        UUID REFERENCES users(id),
  action         TEXT NOT NULL,  -- upload, verify_success, verify_fail, invite_create, invite_consume, sign_use, revoke
  payload        JSONB,
  ip             INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_mcd ON mcd_audit_log(mcd_id, created_at DESC);
```

---

## 2. Справочник ЕКП

Таблица `ekp_catalog` — справочник всех кодов полномочий, подтягивается с сайта ФНС.

```sql
CREATE TABLE ekp_catalog (
  code           VARCHAR(64) PRIMARY KEY,
  name           TEXT NOT NULL,
  department     VARCHAR(32),                  -- BBDOCS, FAS, ...
  subsystem      VARCHAR(32),
  parent_code    VARCHAR(64) REFERENCES ekp_catalog(code),   -- иерархия полномочий
  deprecated     BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at      TIMESTAMPTZ
);
```

Периодически синхронизировать с реестром ФНС (cron раз в сутки).

---

## 3. Маппинг «тип документа → достаточные полномочия»

Бэкенд хранит конфиг (можно в БД или в коде):

```yaml
# Список "приемлемых" кодов для каждого типа действия в eTRN
signing_requirements:
  sign_etrn:           # подписание электронной транспортной накладной
    required_one_of:
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS8      # прямое: транспортные накладные
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS7      # ТТН
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS5      # широкое: ТН+УПД
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCSGENERAL # общее: все первичные

  sign_ezz:            # электронный заказ-наряд
    required_one_of:
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCSGENERAL
      # TODO: уточнить код для ЭЗЗ у юриста

  sign_invoice:
    required_one_of:
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS4
      - BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCSGENERAL
```

Правило проверки: если **хотя бы один** код из `required_one_of` есть в `mcd_power` юзера — разрешено.

Список утверждается совместно с юристом/методологом ЭДО.

---

## 4. REST API

Все эндпоинты требуют JWT (кроме `GET /mcd/invite/:token/preview` — публичный preview для лендоса).

### 4.1 Загрузка и парсинг XML

```
POST /api/v1/mcd/parse
Content-Type: multipart/form-data

Body:
  file: XML (до 10 MB, MIME: application/xml|text/xml, .xml extension)

Response 200:
{
  "draftId": "uuid",                         // TTL 10 минут, нужен для attach
  "parsed": {
    "number": "МЧД-2026-00456",
    "principal": {
      "inn": "7712345678",
      "ogrn": "1157746734837",
      "kpp": "771401001",
      "name": "ООО «ТрансЛогистик»",
      "kind": "ul"                           // ul | ip | fl
    },
    "trustedPerson": {
      "fullName": "Иванов Сергей Петрович",
      "inn": "123456789012",
      "snils": "145-371-033 53"
    },
    "validFrom": "2026-01-15",
    "validUntil": "2027-01-15",
    "powers": [
      {
        "code": "BBDOCS_DOCS_DCSALL_SRCDOC_SOURCEDOCS8",
        "name": "Подписывать транспортные накладные",
        "constraints": null                  // доп. ограничения если есть
      }
    ],
    "registryGuid": "472e846e-572b-4696-9ab1-ff839f9b0634"
  }
}

Errors:
  400 invalid_format       — файл не XML или не соответствует EMCHD_1
  400 file_too_large       — больше 10 MB
  400 parse_failed         — XML сломан или не распознан
  422 already_linked       — у этого юзера уже есть МЧД с таким number+principal
```

**Что делает бэк:**
1. Валидирует MIME/размер
2. Антивирус (ClamAV или аналог)
3. Парсит XML по схеме `EMCHD_1` (namespace `urn://x-artefacts/EMCHD_1`)
4. Рассчитывает `file_hash_sha256`
5. Сохраняет файл в S3 в bucket `mcd-drafts/` с TTL 10 минут
6. Возвращает `draftId` (связан с файлом, hash, parsed)

### 4.2 Привязка МЧД (запуск верификации)

```
POST /api/v1/mcd/attach
Content-Type: application/json

Body:
{
  "draftId": "uuid",
  "inviteToken": "optional-if-by-invite"    // если пришёл по invite-ссылке
}

Response 202 Accepted:                       // async job
{
  "mcdId": "uuid",
  "jobId": "uuid",
  "status": "pending_verification"
}

Errors:
  404 draft_not_found
  410 draft_expired           — TTL вышел, повторите парсинг
  422 trusted_person_mismatch — ФИО в МЧД ≠ ФИО юзера (если strict mode)
  422 invite_invalid          — token не валиден
```

**4 шага верификации** (выполняются async, фронт поллит `GET /mcd/jobs/:jobId`):
1. **Формат файла** — проверка XSD схемы ФНС
2. **ЭП доверителя** — проверка CAdES/XAdES через криптопровайдер (КриптоПро/ViPNet)
3. **Реестр ФНС** — `GET https://m4d.nalog.gov.ru/api/v1/check/{guid}` — статус «действует»
4. **Привязка к аккаунту** — транзакционно создаём `mcd` + `mcd_power`, переносим файл из `mcd-drafts/` в `mcd-files/`, если был `inviteToken` — помечаем invite как consumed

После успеха: `mcd.status = 'linked'`, пишем в audit log, шлём push-уведомление юзеру.

### 4.3 Статус верификации

```
GET /api/v1/mcd/jobs/:jobId

Response 200:
{
  "jobId": "uuid",
  "status": "running | done | failed",
  "currentStep": 2,
  "steps": [
    { "name": "format_check",    "status": "done" },
    { "name": "signature_check", "status": "running" },
    { "name": "fns_registry",    "status": "pending" },
    { "name": "account_link",    "status": "pending" }
  ],
  "error": null,                             // при failed — код ошибки
  "mcdId": "uuid"
}
```

Фронт может поллить каждые 500 мс, или использовать Server-Sent Events / WebSocket для real-time прогресса.

### 4.4 Список МЧД пользователя

```
GET /api/v1/mcd?status=linked&principalInn=7712345678

Response 200:
{
  "mcds": [
    {
      "id": "uuid",
      "number": "МЧД-2026-00456",
      "status": "linked",
      "principal": { "inn": "7712345678", "name": "ООО «ТрансЛогистик»", ... },
      "trustedPerson": "Иванов С. П.",
      "validFrom": "2026-01-15",
      "validUntil": "2027-01-15",
      "powers": [{ "code": "BBDOCS_...", "name": "..." }],
      "fileUrl": "https://cdn.etrn.ru/mcd/signed-url/...",   // подписанный URL на 5 мин
      "registryGuid": "uuid",
      "uploadedAt": "..."
    }
  ]
}
```

### 4.5 Одна МЧД + связанные документы

```
GET /api/v1/mcd/:mcdId

Response 200: { ...mcd, auditLog: [...], usedForDocuments: [...] }
```

### 4.6 Повторная проверка в реестре ФНС

```
POST /api/v1/mcd/:mcdId/refresh

Response 200: { status, validUntil, powers }
```

Использовать:
- При статусах `expired`, `invalid`, `insufficient` — кнопка «Обновить» в UI
- Автоматически, cron раз в сутки для всех `linked` МЧД

### 4.7 Удаление / отвязка

```
DELETE /api/v1/mcd/:mcdId

Response 204 No Content
```

Мягкое удаление (флаг `revoked_at`). Файл в S3 держать 90 дней, потом физически удалять.

---

## 5. Invite-ссылки (защищённый обмен МЧД)

### 5.1 Создание инвайта

```
POST /api/v1/mcd/invite

Body:
{
  "recipientName": "Петров Иван Иванович",
  "recipientContact": "+79001234567",        // E.164 phone или email
  "channel": "sms | email",
  "ttlDays": 7,                              // optional, дефолт 7
  "oneTime": true                            // optional, дефолт true
}

Response 201:
{
  "inviteId": "uuid",
  "token": "zs6EQs5540c0hWdI3t4F60cGvP3eazjT4niWkEfJezs",   // 256 бит, URL-safe base64
  "inviteUrl": "https://app.etrn.ru/#/mcd?invite=<token>",
  "expiresAt": "2026-04-26T00:00:00Z"
}

Errors:
  422 invalid_contact        — телефон/email не валидный
  429 rate_limit_exceeded    — больше 10 активных инвайтов от одного юзера
```

**Как бэк формирует токен:**

Вариант А (stateless, рекомендуется):
```
payload = base64url({ inviteId, inviterUserId, exp })
signature = HMAC_SHA256(payload, SERVER_SECRET)
token = payload + "." + base64url(signature)
```

Вариант Б (stateful, проще):
```
token = random_bytes(32) (256 bit)
hash = SHA-256(token)
// сохраняем hash в mcd_invite.token_hash
```

В прототипе использован вариант Б. Выбор — на усмотрение бэкендера, **обязательно одно из двух**.

**При создании:**
1. Валидация recipient (phone E.164 или email по RFC 5322)
2. Rate-limit: не более 10 активных инвайтов на `inviter_user_id`
3. Сохранение в БД (`token_hash`, не сам токен)
4. Отправка SMS/Email через провайдера (SMS-центр, Mailgun, SendGrid)
5. Audit log: `action='invite_create'` + IP + UA
6. Возврат URL (токен появляется только в URL и в response один раз)

### 5.2 Публичный preview для лендоса

```
GET /api/v1/mcd/invite/:token/preview

Response 200:                                // БЕЗ JWT, публичный
{
  "valid": true,
  "inviter": {
    "name": "Смирнов Алексей Николаевич",
    "company": "ООО «ТрансЛогистик»"
  },
  "recipient": {
    "name": "Петров Иван Иванович"
  },
  "expiresAt": "2026-04-26T00:00:00Z"
}

Response 410 Gone:
{
  "valid": false,
  "reason": "expired | revoked | used | not_found | malformed"
}
```

Используется лендингом при открытии invite-ссылки. Возвращает минимум данных — только для UI.

⚠️ Rate-limit по IP (например 60 запросов/мин), чтобы нельзя было bruteforce'ить токены.

### 5.3 Использование invite → привязка МЧД

Invite токен передаётся на этапе `POST /mcd/attach` (см. 4.2). Бэк атомарно:
1. Валидирует токен через `token_hash`
2. Создаёт `mcd`
3. Помечает invite как `consumed_at = now()`, `consumed_mcd_id = mcd.id`
4. Audit log

### 5.4 Отзыв

```
DELETE /api/v1/mcd/invite/:inviteId

Response 204
```

Только создатель инвайта может отозвать. `revoked_at = now()`.

### 5.5 Список активных инвайтов

```
GET /api/v1/mcd/invite?status=active

Response 200: { invites: [...без token...] }
```

---

## 6. Интеграция в процесс подписания

### 6.1 Поиск подходящей МЧД

```
GET /api/v1/mcd/find-for-signing?docType=etrn&senderInn=7712345678

Response 200:
{
  "mcd": {                                   // null если не найдена
    "id": "uuid",
    "number": "МЧД-2026-00456",
    "principal": { ... },
    "powers": [...]
  }
}
```

**Серверная логика** (pseudo-код):

```python
def find_mcd_for_signing(user_id, doc_type, sender_inn):
    required = SIGNING_REQUIREMENTS[doc_type]['required_one_of']
    return db.execute("""
        SELECT m.* FROM mcd m
        JOIN mcd_power p ON p.mcd_id = m.id
        WHERE m.user_id = %s
          AND m.principal_inn = %s
          AND m.status = 'linked'
          AND m.valid_until > CURRENT_DATE
          AND m.revoked_at IS NULL
          AND p.code = ANY(%s)
        ORDER BY m.uploaded_at DESC
        LIMIT 1
    """, user_id, sender_inn, required)
```

### 6.2 Подпись документа

```
POST /api/v1/documents/:docId/sign

Body:
{
  "mcdId": "uuid",                           // обязательно
  "mode": "sign | reservations | refuse",
  "signature": "<base64 CAdES/XAdES>",
  "geoLocation": { "lat": 55.75, "lng": 37.61, "address": "..." },
  "reservationsText": "optional"
}

Response 200: { ...document with updated status... }

Errors 422:
  mcd_required           — mcdId не передан или юзер не владеет этой МЧД
  mcd_expired            — МЧД просрочена
  mcd_revoked            — отозвана
  mcd_insufficient_power — нет кода из required_one_of для этого типа документа
  mcd_principal_mismatch — principal_inn ≠ sender_inn документа
```

**Важно:** всегда перепроверять на сервере, что МЧД:
1. Принадлежит текущему юзеру (`user_id`)
2. Активна (`status = 'linked'`, `valid_until > now`)
3. `principal_inn == doc.sender_inn`
4. Содержит хотя бы один код из `required_one_of[doc.type]`
5. (Опционально) Проверка в реестре ФНС свежая (< 24 часа), иначе `POST /mcd/:id/refresh`

После успеха: сохраняем в `document.history`: `used_mcd_id`, `used_mcd_number`, `used_mcd_principal_inn`.

### 6.3 Что отправляется оператору ЭДО

Вместе с подписью передаётся **только одна** МЧД — та, что нашлась по правилам выше:

```xml
<!-- В конверте для оператора ЭДО -->
<Signature>
  <MCD>
    <Number>МЧД-2026-00456</Number>
    <GUID>472e846e-572b-4696-9ab1-ff839f9b0634</GUID>
    <PrincipalInn>7712345678</PrincipalInn>
  </MCD>
  <!-- CAdES/XAdES сама подпись -->
</Signature>
```

Оператор сверяется с реестром ФНС по `GUID`. **Не отправлять XML-файл МЧД** в конверте — только ссылочные поля.

---

## 7. Безопасность (обязательно)

### 7.1 Токены
- Invite-токены минимум 256 бит энтропии через CSPRNG (`crypto.getRandomValues`, `secrets.token_urlsafe`)
- Храним только SHA-256 хеш
- URL-safe base64

### 7.2 Rate-limiting
| Endpoint | Лимит |
|---|---|
| `POST /mcd/parse` | 10/час на юзера |
| `POST /mcd/attach` | 20/час на юзера |
| `POST /mcd/invite` | 10/час на юзера, 30/сутки на IP |
| `GET /mcd/invite/:token/preview` | 60/мин на IP |
| `POST /mcd/:id/refresh` | 1 запрос / 5 мин на МЧД |

### 7.3 Audit log — **всё** критичное
`action ∈ {upload, verify_success, verify_fail, invite_create, invite_consume, invite_revoke, sign_use, mcd_refresh, mcd_revoke}`

С полями `user_id, ip, user_agent, timestamp, payload`.

### 7.4 Файлы
- S3 / MinIO. Bucket `mcd-files` (приватный), `mcd-drafts` (TTL 10 мин).
- Доступ только через подписанные URL (`signed-url/{path}?expires=300`).
- Антивирус на входе (ClamAV).
- Проверка magic bytes, не доверять Content-Type.

### 7.5 Персональные данные
Оператор персональных данных — **Компания (КУБ)**. Бэкенд — процессор.
При удалении юзера → удалить МЧД-файлы и обезличить audit log в срок 30 дней (152-ФЗ).

---

## 8. События для фронта

Если используется WebSocket/SSE:

```
event: mcd.verification.progress
data: { jobId, step: 2, status: 'done' }

event: mcd.verification.completed
data: { jobId, mcdId, status: 'linked' }

event: mcd.verification.failed
data: { jobId, error: 'invalid_signature' }

event: mcd.invite.consumed
data: { inviteId, mcdId }   // отправителю — когда получатель загрузил МЧД
```

---

## 9. Тест-кейсы

### 9.1 Happy path
1. Юзер A вошёл → `POST /mcd/invite` с ФИО/телефоном → получил URL
2. Юзер B перешёл по URL → `GET /mcd/invite/:token/preview` → видит лендос
3. Юзер B авторизуется → `POST /mcd/parse` с XML → `POST /mcd/attach` с `inviteToken`
4. 4 шага верификации → `mcd.status = 'linked'`
5. Invite автоматически `consumed_at`, повторное использование возвращает 410

### 9.2 Негативные
- Поменяли один символ в токене → `not_found`
- Токен от другого юзера → проверяется `inviterUserId` в HMAC / DB
- TTL истёк → `expired`
- Попытка повторного consume → `used`
- Invite отозвали вручную → `revoked`
- МЧД с `principal_inn ≠ doc.sender_inn` → `mcd_principal_mismatch`
- МЧД без нужного кода → `mcd_insufficient_power`
- Двойная загрузка одной МЧД → `already_linked`

---

## 10. Чек-лист для готовности к проду

- [ ] Миграции таблиц `mcd`, `mcd_power`, `mcd_invite`, `mcd_audit_log`, `ekp_catalog`
- [ ] Seed `ekp_catalog` с кодами ФНС
- [ ] Конфиг `signing_requirements` (совместно с юристом)
- [ ] 12 эндпоинтов из раздела 4-6 с OpenAPI-схемой
- [ ] Парсер XML формата EMCHD_1 (см. примеры в `docs/samples/`)
- [ ] Интеграция с криптопровайдером (проверка CAdES подписи доверителя)
- [ ] Интеграция с `m4d.nalog.gov.ru` API (проверка реестра)
- [ ] Async job runner для 4-шаговой верификации (Celery / BullMQ / etc.)
- [ ] SMS-провайдер (SMS-центр) + email-провайдер (Mailgun/SendGrid)
- [ ] S3/MinIO конфиг + антивирус
- [ ] Rate-limiter (Redis-based)
- [ ] Audit log с индексом по `user_id, created_at`
- [ ] Cron: ежесуточная синхронизация `mcd.status` с реестром ФНС
- [ ] Тесты: happy path + все негативные сценарии из раздела 9

---

## Ссылки на прототип

Референсная реализация на клиенте (не для прода, но логика та же):

| Что | Файл |
|---|---|
| Invite-ссылки, генерация токенов | [`src/lib/mcdInvite.ts`](../src/lib/mcdInvite.ts) |
| Валидация/consume/revoke | [`src/lib/mcdInvite.ts`](../src/lib/mcdInvite.ts) |
| Парсинг XML-МЧД (мок) | [`src/lib/mockMcdParser.ts`](../src/lib/mockMcdParser.ts) |
| Поиск МЧД для подписи | `findMcdForPower()` в `mockMcdParser.ts` |
| UI загрузки/привязки МЧД | [`src/pages/McdLandingPage.tsx`](../src/pages/McdLandingPage.tsx) |
| UI создания инвайта | [`src/pages/McdInvitePage.tsx`](../src/pages/McdInvitePage.tsx) |
| UI лендоса для получателя | [`src/components/mcd/InviteLanding.tsx`](../src/components/mcd/InviteLanding.tsx) |
| Интеграция с подписанием | [`src/pages/DocumentDetailPage.tsx`](../src/pages/DocumentDetailPage.tsx), [`src/pages/SigningFlowPage.tsx`](../src/pages/SigningFlowPage.tsx) |
| Типы данных | [`src/lib/constants.ts`](../src/lib/constants.ts) (`Mcd`, `McdPower`, `EKP_CATALOG`) |

**Живой прототип:** https://aleksaletin.github.io/etrn/

**Примеры реальных XML-МЧД:** [`docs/samples/`](./samples/)

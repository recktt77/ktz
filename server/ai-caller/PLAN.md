# AI-Caller Module — План реализации

## Обзор

Новый микросервис **ai-caller** интегрируется в существующую архитектуру KTZ как ещё один потребитель RabbitMQ-событий. При возникновении **critical** алерта сервис определяет ответственного сотрудника, звонит ему через Asterisk (SIP), и ведёт голосовой диалог через **OpenAI GPT Realtime API**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Существующая архитектура                          │
│                                                                      │
│  Normalization Service (8085)                                        │
│  ├── evaluateAlerts() → severity: 'critical'                        │
│  ├── WebSocket: alert_created → Frontend                            │
│  └── RabbitMQ: alert.critical.created ──┐  ← НОВОЕ СОБЫТИЕ         │
│                                          │                           │
└──────────────────────────────────────────┼───────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────┐
                    │         AI-Caller Service (8087)            │
                    │                                              │
                    │  1. Получает alert из RabbitMQ              │
                    │  2. Определяет кому звонить (routing rules) │
                    │  3. Запрашивает телефон из БД               │
                    │  4. Формирует контекст (БЕЗ перс. данных)  │
                    │  5. Подключается к GPT Realtime API         │
                    │  6. Инициирует SIP-звонок через Asterisk    │
                    │  7. Мост: SIP ↔ GPT Realtime (двусторонний)│
                    │  8. Логирует результат                      │
                    │  9. Планирует retry через 5 мин             │
                    └──────┬──────────────┬───────────────────────┘
                           │              │
                    ┌──────▼──────┐ ┌─────▼──────────────┐
                    │  Asterisk   │ │ OpenAI GPT Realtime│
                    │  (SIP PBX)  │ │   (WebSocket API)  │
                    │  Port 5060  │ │                    │
                    │  ARI: 8088  │ │  System prompt:    │
                    │             │ │  контекст алерта   │
                    │  AudioSocket│ │  + инструкции      │
                    │  → ws bridge│ │  (без перс. данных)│
                    └─────────────┘ └────────────────────┘
```

---

## Фаза 0: Подготовка БД и существующих сервисов

### 0.1 Новые таблицы в `realtime_ktzh`

```sql
-- Схема: ai_caller

-- Назначение сотрудников на локомотивы
CREATE TABLE ai_caller.staff_assignments (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL,               -- FK → auth_db.users
    locomotive_id VARCHAR(20) NOT NULL,        -- FK → locomotive.locomotives
    role          VARCHAR(20) NOT NULL,        -- 'driver' | 'engineer' | 'dispatcher'
    phone_number  VARCHAR(20) NOT NULL,        -- SIP URI или телефон
    is_active     BOOLEAN DEFAULT true,
    assigned_at   TIMESTAMPTZ DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ
);

-- Правила маршрутизации звонков
CREATE TABLE ai_caller.call_routing_rules (
    id              SERIAL PRIMARY KEY,
    model_code      VARCHAR(10),              -- 'KZ8A' | 'TE33A' | NULL (для всех)
    metric_pattern  VARCHAR(100) NOT NULL,     -- regex или exact match: 'speed_kmh', 'brake_*'
    component       VARCHAR(50),               -- 'traction', 'brake_system', etc.
    target_role     VARCHAR(20) NOT NULL,       -- 'driver' | 'engineer' | 'dispatcher'
    priority        INT DEFAULT 0,             -- чем выше — тем важнее
    is_active       BOOLEAN DEFAULT true
);

-- Лог звонков
CREATE TABLE ai_caller.call_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id        UUID NOT NULL,             -- FK → normalization.alerts
    locomotive_id   VARCHAR(20) NOT NULL,
    target_role     VARCHAR(20) NOT NULL,
    call_status     VARCHAR(20) NOT NULL,       -- 'initiated' | 'answered' | 'no_answer' | 'failed' | 'completed'
    initiated_at    TIMESTAMPTZ DEFAULT NOW(),
    answered_at     TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    duration_sec    INT,
    retry_count     INT DEFAULT 0,
    asterisk_call_id VARCHAR(100),
    error_message   TEXT,
    -- НЕ храним телефон в логе — только role + locomotive_id
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cooldown-трекер (чтобы не спамить звонками)
CREATE TABLE ai_caller.alert_call_state (
    alert_id        UUID PRIMARY KEY,
    locomotive_id   VARCHAR(20) NOT NULL,
    first_call_at   TIMESTAMPTZ NOT NULL,
    last_call_at    TIMESTAMPTZ NOT NULL,
    next_retry_at   TIMESTAMPTZ,
    total_retries   INT DEFAULT 0,
    max_retries     INT DEFAULT 5,
    resolved        BOOLEAN DEFAULT false
);
```

### 0.2 Правила маршрутизации (seed-данные)

| Метрика | Компонент | Целевая роль | Логика |
|---------|-----------|-------------|--------|
| `speed_kmh` | — | **driver** | Превышение скорости — ответственность машиниста |
| `brake_system_pressure_bar` | brake_system | **driver** | Тормозная система — безопасность движения |
| `traction_mode` | traction | **driver** | Режим тяги — управление машиниста |
| `main_transformer_temp_c` | transformer | **engineer** | Перегрев оборудования — инженер |
| `traction_converter_temp_c` | converter | **engineer** | Перегрев конвертера — инженер |
| `catenary_voltage_kv` | electrical | **engineer** | Электропитание — инженер |
| `engine_load_pct` | engine | **engineer** | Нагрузка двигателя — инженер |
| `engine_rpm` | engine | **engineer** | Обороты — инженер |
| `fuel_level_pct` | fuel | **dispatcher** | Топливо — оперативное решение диспетчера |
| `fuel_consumption_lph` | fuel | **dispatcher** | Аномальный расход — диспетчер |
| `fault_code` (любой) | — | **dispatcher** | Аппаратная неисправность — диспетчер |

### 0.3 Изменения в Normalization Service

Добавить публикацию нового события в RabbitMQ при создании critical-алерта:

```javascript
// В evaluateAlerts(), после создания алерта с severity='critical':
await channel.publish('telemetry', 'alert.critical.created', Buffer.from(JSON.stringify({
    alert_id: alert.id,
    locomotive_id: alert.locomotive_id,
    locomotive_model: alert.locomotive_model,  // 'KZ8A' | 'TE33A'
    severity: 'critical',
    metric: alert.metric,
    component: alert.component,
    value: alert.value,
    threshold: alert.threshold,
    direction: alert.direction,
    timestamp: alert.created_at
})));

// При resolve алерта:
await channel.publish('telemetry', 'alert.critical.resolved', Buffer.from(JSON.stringify({
    alert_id: alert.id,
    locomotive_id: alert.locomotive_id
})));
```

---

## Фаза 1: Asterisk в Docker

### 1.1 Конфигурация Asterisk

```
server/asterisk/
├── Dockerfile
├── conf/
│   ├── asterisk.conf
│   ├── modules.conf
│   ├── http.conf          # ARI HTTP
│   ├── ari.conf           # ARI credentials
│   ├── pjsip.conf         # SIP endpoints
│   ├── extensions.conf    # Dialplan
│   └── rtp.conf           # RTP порты
```

**Ключевые настройки:**
- **ARI (Asterisk REST Interface)** на порту 8088 — для управления звонками из Node.js
- **PJSIP** — SIP-стек для исходящих звонков
- **AudioSocket** — канальный драйвер для передачи аудио по WebSocket напрямую в наш сервис

**Dialplan (extensions.conf):**
```
[ai-caller]
exten => _X.,1,NoOp(AI Caller outbound to ${EXTEN})
 same => n,Answer()
 same => n,AudioSocket(${AUDIOSOCKET_UUID},ws://ai-caller:9090/audio)
 same => n,Hangup()
```

### 1.2 Docker Compose

```yaml
asterisk:
    build: ./server/asterisk
    ports:
      - "5060:5060/udp"    # SIP
      - "5060:5060/tcp"    # SIP TCP
      - "8088:8088"        # ARI
      - "10000-10100:10000-10100/udp"  # RTP
    networks:
      - ktz-network
    volumes:
      - asterisk-data:/var/lib/asterisk
```

---

## Фаза 2: AI-Caller Service (Node.js)

### 2.1 Структура сервиса

```
server/ai-caller/
├── Dockerfile
├── package.json
├── nodemon.json
├── src/
│   ├── index.js                    # Entry point
│   ├── config/
│   │   └── index.js                # ENV-конфиг
│   ├── consumers/
│   │   ├── alertConsumer.js        # RabbitMQ consumer
│   │   └── resolveConsumer.js      # Alert resolved consumer
│   ├── services/
│   │   ├── routingService.js       # Определяет кому звонить по правилам
│   │   ├── callOrchestrator.js     # Оркестрация: lookup → call → log → retry
│   │   ├── asteriskService.js      # ARI клиент, управление звонками
│   │   ├── gptRealtimeService.js   # OpenAI Realtime API bridge
│   │   ├── audioBridge.js          # AudioSocket ↔ GPT Realtime аудио-мост
│   │   ├── retryScheduler.js       # Планировщик повторных звонков
│   │   └── messageBuilder.js       # Формирует system prompt для GPT
│   ├── db/
│   │   └── pool.js                 # PostgreSQL connection
│   ├── models/
│   │   ├── staffAssignment.js      # CRUD staff_assignments
│   │   ├── callRoutingRule.js      # CRUD routing rules
│   │   ├── callLog.js              # CRUD call_log
│   │   └── alertCallState.js       # CRUD alert_call_state
│   ├── routes/
│   │   ├── index.js
│   │   ├── assignments.js          # REST API: управление назначениями
│   │   ├── rules.js                # REST API: управление правилами
│   │   └── calls.js                # REST API: лог звонков, статистика
│   ├── middleware/
│   │   └── auth.js                 # JWT-валидация (через gateway)
│   ├── ws/
│   │   └── audioSocketServer.js    # WebSocket для приёма аудио от Asterisk
│   └── utils/
│       └── logger.js               # Structured logging (pino)
```

### 2.2 Ключевые компоненты

#### A. Alert Consumer (RabbitMQ)

```
Exchange: telemetry (topic)
Queue: ai_caller.critical_alerts
Binding: alert.critical.created
```
- Получает critical alert event
- Проверяет cooldown (не звонили ли уже по этому алерту)
- Передаёт в callOrchestrator

#### B. Call Orchestrator — главная логика

```
1. Получает alert event
2. routingService.getTargetRole(metric, component, model) → role
3. staffAssignment.findByLocomotiveAndRole(locomotive_id, role) → { phone_number }
4. messageBuilder.buildSystemPrompt(alert) → system prompt (БЕЗ phone/name)
5. asteriskService.originateCall(phone_number, audio_socket_id) → call
6. gptRealtimeService.createSession(system_prompt) → session
7. audioBridge.connect(asterisk_audio_stream, gpt_session) → bidirectional
8. Ждёт завершения звонка
9. callLog.create(result)
10. alertCallState.updateRetrySchedule(alert_id)
```

#### C. GPT Realtime API Bridge

**System prompt для GPT (пример):**
```
Ты — автоматическая система мониторинга локомотивов КТЖ.
Ты позвонил машинисту потому что обнаружено критическое отклонение.

КОНТЕКСТ АЛЕРТА:
- Локомотив: KTZ-4021 (модель KZ8A)
- Метрика: Скорость (speed_kmh)
- Текущее значение: 168 км/ч
- Критический порог: 160 км/ч
- Время обнаружения: 14:23:05

ТВОЯ ЗАДАЧА:
1. Представься: "Здравствуйте, это автоматическая система мониторинга КТЖ"
2. Сообщи о проблеме кратко и чётко
3. Попроси обратить внимание на дэшборд для подробностей
4. Если сотрудник задаёт вопросы — отвечай ТОЛЬКО на основе контекста алерта
5. НЕ сообщай никаких персональных данных
6. Будь лаконичен, разговор должен занять не более 30-60 секунд
7. После передачи информации — попрощайся

ОГРАНИЧЕНИЯ:
- Говори ТОЛЬКО по-русски
- НЕ выдумывай данные, которых нет в контексте
- НЕ давай советов по ремонту, только констатируй факт и направляй на дэшборд
```

**Аудио-формат**: PCM 16-bit, 8kHz (совместимо с SIP/G.711) или 24kHz с транскодингом.

#### D. AudioSocket Bridge (Asterisk ↔ GPT Realtime)

```
Asterisk AudioSocket                     GPT Realtime API
    (WebSocket)                             (WebSocket)
        │                                       │
        │  PCM audio from phone                 │
        ├──────────────────────────────────────►│  input_audio_buffer.append
        │                                       │
        │                                       │  response.audio.delta
        │◄──────────────────────────────────────┤  (audio chunks)
        │  PCM audio to phone                   │
        │                                       │
```

Сервис `audioBridge.js`:
1. Принимает WebSocket от Asterisk (AudioSocket протокол)
2. Конвертирует Asterisk audio (slin16, 8kHz) → PCM 24kHz (если нужно)
3. Отправляет в GPT Realtime через `input_audio_buffer.append`
4. Получает `response.audio.delta` от GPT
5. Конвертирует audio → Asterisk формат
6. Отправляет обратно в AudioSocket

#### E. Retry Scheduler

```
- Проверяет alert_call_state каждые 60 секунд
- Если next_retry_at <= now() И resolved = false И total_retries < max_retries:
    → Инициирует повторный звонок
- При получении alert.critical.resolved → resolved = true, отмена retry
- Интервал: 5 минут между звонками
- Max retries: 5 (настраиваемо)
```

### 2.3 REST API

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/assignments` | Список назначений |
| `POST` | `/assignments` | Назначить сотрудника на локомотив |
| `DELETE` | `/assignments/:id` | Снять назначение |
| `GET` | `/rules` | Правила маршрутизации |
| `POST` | `/rules` | Создать правило |
| `PATCH` | `/rules/:id` | Обновить правило |
| `GET` | `/calls` | Лог звонков (с фильтрами) |
| `GET` | `/calls/stats` | Статистика звонков |
| `GET` | `/health` | Healthcheck |

### 2.4 Docker Compose

```yaml
ai-caller:
    build: ./server/ai-caller
    ports:
      - "8087:8087"    # REST API
      - "9090:9090"    # AudioSocket WebSocket
    environment:
      PORT: 8087
      AUDIO_SOCKET_PORT: 9090
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: realtime_ktzh
      DB_USER: normalization
      DB_PASSWORD: normalization
      DB_SCHEMA: ai_caller
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
      ASTERISK_ARI_URL: http://asterisk:8088
      ASTERISK_ARI_USER: ai-caller
      ASTERISK_ARI_PASSWORD: ${ASTERISK_ARI_PASSWORD}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENAI_REALTIME_MODEL: gpt-4o-realtime-preview
      RETRY_INTERVAL_MS: 300000
      MAX_RETRIES: 5
      CALL_TIMEOUT_SEC: 60
    depends_on:
      - postgres
      - rabbitmq
      - asterisk
    networks:
      - ktz-network
```

---

## Фаза 3: Интеграция с Gateway & Frontend

### 3.1 API Gateway

Добавить проксирование в gateway:
```javascript
// /api/ai-caller/* → ai-caller:8087
```

---

## Фаза 4: Надёжность & Логирование

### 4.1 Логирование (pino, structured JSON)

Каждый звонок логирует:
```json
{
    "level": "info",
    "event": "call_completed",
    "alert_id": "uuid",
    "locomotive_id": "KTZ-4021",
    "target_role": "driver",
    "duration_sec": 25,
    "retry_count": 0,
    "call_status": "completed"
}
```
**Без персональных данных** (без phone, без имени).

Основные log-events:
- `alert_received` — получен critical alert из RabbitMQ
- `call_initiated` — звонок инициирован через Asterisk
- `call_answered` — абонент поднял трубку
- `call_completed` — звонок завершён
- `call_failed` — ошибка (+ error_message)
- `call_no_answer` — не дозвонились
- `retry_scheduled` — запланирован повторный звонок
- `alert_resolved` — алерт снят, retry отменён
- `gpt_session_error` — ошибка GPT Realtime API

### 4.2 Health check

```
GET /health
{
    "status": "ok",
    "rabbitmq": "connected",
    "postgres": "connected",
    "asterisk": "connected",
    "active_calls": 0,
    "pending_retries": 2
}
```

### 4.3 Graceful shutdown

- SIGTERM → прекращаем принимать новые алерты из RabbitMQ
- Дожидаемся завершения активных звонков (таймаут 30с)
- Закрываем соединения (DB, RabbitMQ, Asterisk ARI)
- Процесс завершается

### 4.4 Автоматическое переподключение

- RabbitMQ: reconnect с exponential backoff (1s → 30s)
- PostgreSQL: pg pool с автоматическим reconnect
- Asterisk ARI: reconnect при потере соединения

---

## Порядок реализации (этапы)

### Этап 1 — Фундамент (БД + Normalization event)
1. Создать схему `ai_caller` и таблицы в PostgreSQL
2. Seed-данные для routing rules
3. Добавить publish `alert.critical.created` / `alert.critical.resolved` в Normalization
4. Протестировать что event приходит в RabbitMQ

### Этап 2 — Asterisk в Docker
5. Dockerfile + конфигурация Asterisk
6. PJSIP endpoint для исходящих звонков
7. ARI настройка + AudioSocket
8. Тест: можно инициировать звонок через ARI

### Этап 3 — AI-Caller Service (Core)
9. Scaffolding: package.json, Dockerfile, config, DB pool
10. RabbitMQ consumer (alert.critical.created / resolved)
11. Routing service (определяет role по метрике)
12. Staff assignment model (lookup phone по locomotive + role)
13. Asterisk ARI service (initiate call)
14. GPT Realtime service (create session, system prompt)
15. AudioSocket WebSocket server
16. Audio bridge (Asterisk ↔ GPT Realtime)
17. Call orchestrator (собирает всё вместе)
18. Retry scheduler

### Этап 4 — REST API + Интеграция
19. REST endpoints (assignments, rules, calls)
20. API Gateway routing
21. Docker Compose integration
22. E2E тест: alert → call → audio → GPT response

### Этап 5 — Frontend
23. Supervisor: управление назначениями
24. Dispatcher: статус звонков в алертах
25. Call log виджет

### Этап 6 — Надёжность
26. Structured logging (pino)
27. Graceful shutdown + авто-реконнекты
28. Healthcheck endpoint

---

## Безопасность (Privacy by Design)

| Что | Где хранится | Кто имеет доступ | Идёт в GPT? |
|-----|-------------|-----------------|-------------|
| Телефон сотрудника | `staff_assignments` (БД) | AI-Caller service | ❌ НЕТ |
| ФИО сотрудника | `auth_db.users` | Auth service | ❌ НЕТ |
| ID сотрудника (user_id) | `staff_assignments` (БД) | AI-Caller service | ✅ Да |
| ID локомотива | Везде | Все сервисы | ✅ Да |
| Метрика/значение | Alert event | AI-Caller + GPT | ✅ Да |
| Порог/направление | Alert event | AI-Caller + GPT | ✅ Да |

GPT получает: locomotive_id, model, metric, value, threshold, timestamp, **user_id** (числовой ID сотрудника).
GPT **НЕ получает**: phone, name, email — никаких персональных данных.

---

## Технологии

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| AI-Caller Service | Node.js + Express | 20 LTS |
| SIP PBX | Asterisk | 20+ |
| Asterisk API | ARI (ari-client npm) | — |
| Audio bridge | AudioSocket protocol | — |
| AI Voice | OpenAI GPT Realtime API | gpt-4o-realtime-preview |
| Message Queue | RabbitMQ | 3.x |
| Database | PostgreSQL | 15+ |
| Logging | pino | 8.x |
| Containerization | Docker | — |

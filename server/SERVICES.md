# Locomotive + Normalization Services — Полная документация

## Оглавление
1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Порты и сетевая схема](#2-порты-и-сетевая-схема)
3. [Locomotive Service](#3-locomotive-service)
4. [Normalization Service](#4-normalization-service)
5. [Взаимодействие между сервисами](#5-взаимодействие-между-сервисами)
6. [База данных](#6-база-данных)
7. [WebSocket протокол](#7-websocket-протокол)
8. [Health Index — формула и логика](#8-health-index)
9. [Как запускать](#9-как-запускать)
10. [API Reference](#10-api-reference)

---

## 1. Обзор архитектуры

```
┌──────────────┐     REST (POST /telemetry/raw)     ┌───────────────────┐
│  Simulator   │ ──────────────────────────────────→ │ Locomotive Service│
│              │                                     │     :8083         │
└──────────────┘                                     └────────┬──────────┘
                                                              │
                                                    RabbitMQ (topic exchange)
                                                    telemetry.raw.received
                                                              │
                                                              ▼
┌──────────────┐     WebSocket (:8080 → :8086)      ┌───────────────────────┐
│   Frontend   │ ←──────────────────────────────────│ Normalization Service  │
│              │                                     │  REST :8085           │
│              │ ──── REST (history, replay, etc.) → │  WS   :8086           │
└──────────────┘                                     └───────────────────────┘
        ▲                                                      │
        │              ┌─────────────────┐                     │
        └──────────────│  API Gateway    │←────────────────────┘
                       │     :8080       │  проксирует WS + REST
                       └─────────────────┘
```

**Два микросервиса:**
- **Locomotive Service** — CRUD локомотивов, приём и хранение raw телеметрии, публикация в очередь
- **Normalization Service** — обработка, нормализация, health index, алерты, role-based views, WebSocket push

**Связь:**
- Locomotive → Normalization: через **RabbitMQ** (асинхронная очередь)
- Normalization → Frontend: через **WebSocket** и **REST API**
- API Gateway (порт 8080) — пишет другой разработчик, проксирует запросы на нужные сервисы

---

## 2. Порты и сетевая схема

| Сервис | Порт | Протокол | Назначение |
|--------|------|----------|------------|
| **Locomotive Service** | 8083 | HTTP/REST | CRUD, приём телеметрии |
| **Normalization Service** | 8085 | HTTP/REST | Health, history, replay, role-views, config |
| **Normalization WS** | 8086 | WebSocket | Live push на фронт |
| **API Gateway** | 8080 | HTTP + WS | Единая точка входа (другой разраб) |
| **PostgreSQL** | 5432 | TCP | База данных |
| **RabbitMQ** | 5672 | AMQP | Очередь сообщений |

**API Gateway (8080) должен проксировать:**
- `GET/POST/PATCH/DELETE /locomotives/*` → `http://localhost:8083/locomotives/*`
- `POST /telemetry/*` → `http://localhost:8083/telemetry/*`
- `GET /models/*` → `http://localhost:8083/models/*`
- `GET /health-index/*` → `http://localhost:8085/health-index/*`
- `GET /snapshots/*` → `http://localhost:8085/snapshots/*`
- `GET /history/*` → `http://localhost:8085/history/*`
- `GET /replay/*` → `http://localhost:8085/replay/*`
- `GET /role-view/*` → `http://localhost:8085/role-view/*`
- `GET/PATCH /thresholds` → `http://localhost:8085/thresholds`
- `GET/PATCH /weights` → `http://localhost:8085/weights`
- `WS /ws` → `ws://localhost:8086/ws`

---

## 3. Locomotive Service

### 3.1. Структура файлов

```
server/locomotive/
├── package.json
├── .env                              # PORT=8083
├── .env.example
└── src/
    ├── index.js                      # Entry point: Express startup, migrations, RabbitMQ connect
    ├── config/
    │   └── index.js                  # Конфигурация из ENV
    ├── db/
    │   ├── pool.js                   # PG-пул с schema isolation (locomotive.*) 
    │   ├── migrate.js                # Автоматический migration runner
    │   └── migrations/
    │       ├── 001_init.sql          # Создание таблиц
    │       └── 002_seed.sql          # Seed моделей KZ8A + TE33A и metric_schemas
    ├── models/
    │   ├── locomotiveRepo.js         # CRUD для таблицы locomotives
    │   ├── modelRepo.js              # Чтение locomotive_models + metric_schemas
    │   └── telemetryRepo.js          # Insert/query telemetry_raw + fault_events_raw
    ├── services/
    │   ├── locomotiveService.js      # Бизнес-логика CRUD (проверка дублей, 404 и т.д.)
    │   ├── telemetryService.js       # Главный pipeline приёма телеметрии
    │   └── rabbitPublisher.js        # Публикация в RabbitMQ (topic exchange)
    ├── controllers/
    │   ├── locomotiveController.js   # HTTP-обработчики для /locomotives
    │   ├── telemetryController.js    # HTTP-обработчики для /telemetry
    │   └── modelController.js        # HTTP-обработчики для /models
    ├── routes/
    │   ├── locomotives.js            # Router: GET/POST/PATCH/DELETE /locomotives
    │   ├── telemetry.js              # Router: POST /telemetry/raw, /telemetry/bulk, GET history
    │   └── models.js                 # Router: GET /models, /models/:model/schema
    ├── validators/
    │   └── schemas.js                # Joi-валидация: CRUD + KZ8A raw + TE33A raw
    ├── middleware/
    │   ├── validate.js               # Generic validation middleware
    │   └── errorHandler.js           # Централизованная обработка ошибок
    └── utils/
        └── logger.js                 # Winston logger
```

### 3.2. Что делает

**Ответственность по спецификации:**
1. CRUD локомотивов (создание, обновление, удаление, список)
2. Хранение типа модели (KZ8A / TE33A)
3. Хранение metric schema для каждой модели
4. Приём raw telemetry от simulator
5. Валидация envelope (Joi-схемы с дискриминатором по locomotive_model)
6. Определение локомотива и модели
7. Сохранение raw telemetry в PostgreSQL
8. Извлечение fault code'ов в отдельную таблицу
9. Обновление позиции локомотива (track_segment_id, position_km)
10. Публикация события `telemetry.raw.received` в RabbitMQ

### 3.3. Pipeline приёма телеметрии (POST /telemetry/raw)

```
Входящий JSON
  │
  ▼
Joi-валидация (KZ8A или TE33A схема по locomotive_model)
  │ ✗ → 400 + publish telemetry.raw.invalid
  ▼
Проверка: локомотив существует? Модель совпадает?
  │ ✗ → 404 / 400
  ▼
INSERT INTO telemetry_raw (payload как JSONB)
  │
  ▼
fault_code != null? → INSERT INTO fault_events_raw
  │
  ▼
track_segment_id / position_km → UPDATE locomotives SET position
  │
  ▼
RabbitMQ publish: telemetry.raw.received
  │
  ▼
201 { status: 'accepted', id, locomotive_id, timestamp_utc, received_at }
```

### 3.4. Валидация

Разделение по моделям через **дискриминатор** `locomotive_model`:
- Если `KZ8A` → kz8aRawSchema (pantograph, catenary, transformer, traction, regen, energy...)
- Если `TE33A` → te33aRawSchema (engine, fuel, propulsion, dynamic_brake, compressor, auxiliaries...)
- Общие поля (BaseTelemetry): speed_kmh, brake_system_*, fault_code, communication_status, control_system_status

Статусы компонентов: `'ok' | 'degraded' | 'fault' | 'offline'`
Статусы связи: `'online' | 'degraded' | 'offline'`

---

## 4. Normalization Service

### 4.1. Структура файлов

```
server/normalization/
├── package.json
├── .env                                   # PORT=8085, WS_PORT=8086
├── .env.example
└── src/
    ├── index.js                           # Entry point: Express + WS server + RabbitMQ consumer
    ├── config/
    │   └── index.js                       # Конфигурация
    ├── db/
    │   ├── pool.js                        # PG-пул (normalization.*)
    │   ├── migrate.js                     # Migration runner
    │   └── migrations/
    │       ├── 001_init.sql               # Таблицы: telemetry_normalized, derived_metrics,
    │       │                              #   health_snapshots, threshold_configs, weight_configs, alerts
    │       └── 002_seed_configs.sql       # Seed порогов и весов для KZ8A + TE33A
    ├── models/
    │   ├── normalizedRepo.js              # CRUD для telemetry_normalized
    │   ├── healthRepo.js                  # CRUD для derived_metrics + health_snapshots
    │   └── configRepo.js                  # CRUD для threshold_configs, weight_configs, alerts
    ├── services/
    │   ├── pipeline.js                    # **ГЛАВНЫЙ ФАЙЛ** — orchestrator всего потока обработки
    │   ├── rabbitConsumer.js              # RabbitMQ consumer + publisher
    │   ├── smoothing.js                   # EMA сглаживание + dedup
    │   ├── healthCalculator.js            # Расчёт health index для KZ8A и TE33A
    │   ├── alertService.js                # Генерация/резолв алертов по порогам
    │   ├── roleViewBuilder.js             # Построение role-based views (driver, dispatcher, engineer, supervisor)
    │   └── adapters/
    │       ├── index.js                   # Роутер по модели → адаптер
    │       ├── kz8aAdapter.js             # Нормализация KZ8A: маппинг полей + smoothing
    │       └── te33aAdapter.js            # Нормализация TE33A: маппинг полей + smoothing
    ├── controllers/
    │   ├── healthController.js            # /health-index, /snapshots, /history, /replay
    │   ├── roleViewController.js          # /role-view/driver|dispatcher|engineer|supervisor
    │   └── configController.js            # /thresholds, /weights (GET + PATCH)
    ├── routes/
    │   ├── health.js
    │   ├── roleViews.js
    │   └── config.js
    ├── ws/
    │   ├── wsServer.js                    # WebSocket server + broadcast логика
    │   └── subscriptionManager.js         # Управление подписками клиентов (role + locomotiveIds)
    ├── middleware/
    │   └── errorHandler.js
    └── utils/
        └── logger.js
```

### 4.2. Полный pipeline обработки (services/pipeline.js)

Это сердце системы. Вызывается для каждого `telemetry.raw.received` из RabbitMQ:

```
RabbitMQ message (telemetry.raw.received)
  │
  ▼
1. Dedup check (500ms окно по locomotive_id)
  │ дупликат → skip
  ▼
2. Normalize (adapter по модели)
  │  KZ8A → kz8aAdapter.normalize() + EMA smoothing
  │  TE33A → te33aAdapter.normalize() + EMA smoothing
  ▼
3. Store → INSERT INTO telemetry_normalized
  │
  ▼
4. WebSocket broadcast: telemetry_update (каждый тик, ~1с)
  │
  ▼
5. Каждый 8-й тик: Processed analytics
  │  calculateHealth() → derived_metrics + health_snapshots
  │  WebSocket broadcast: processed_update
  │  RabbitMQ publish: health.snapshot.updated
  ▼
6. Alert evaluation
  │  Проверка каждой метрики против порогов
  │  Новый алерт → alert_created
  │  Метрика в норме → alert_resolved
  │  WebSocket broadcast
  ▼
7. Update in-memory state (для snapshot_init и REST)
  │
  ▼
8. Каждый 15-й тик: Fleet summary
  │  Агрегация по всем локомотивам
  │  WebSocket broadcast: fleet_summary_update (supervisor)
```

### 4.3. Adapters (нормализация по модели)

Каждый адаптер:
1. Берёт raw поле
2. Для числовых — применяет EMA smoothing (окно = 5 значений, alpha = 2/(N+1))
3. Для enum (статусы) — пропускает as-is
4. Возвращает унифицированный объект

### 4.4. Health Calculator

**Формула:** `health_index = 100 - sum(penalties)`

Каждый фактор имеет **вес** (хранится в БД, можно менять через PATCH /weights):

**KZ8A факторы и дефолтные веса:**
| Фактор | Вес | Что проверяет |
|--------|-----|---------------|
| transformer_thermal | 15 | main_transformer_temp_c > порогов |
| converter_thermal | 10 | traction_converter_temp_c > порогов |
| electrical_supply | 12 | catenary_voltage_kv < порогов |
| brake_pressure | 15 | brake_system_pressure_bar < порогов |
| fault_code | 20 | Наличие активного fault code |
| communication_loss | 10 | communication_status != online |
| component_degradation | 10 | Любой компонент degraded/fault |
| overload | 8 | transformer_load_pct или converter_load_pct > порогов |

**TE33A факторы и дефолтные веса:**
| Фактор | Вес | Что проверяет |
|--------|-----|---------------|
| engine_overload | 15 | engine_load_pct > порогов |
| fuel_anomaly | 12 | fuel_consumption_lph > порогов |
| brake_pressure | 15 | brake_system_pressure_bar < порогов |
| fault_code | 20 | Наличие активного fault code |
| communication_loss | 10 | communication_status != online |
| component_degradation | 10 | Любой компонент degraded/fault |
| engine_thermal | 10 | engine_rpm > порогов |
| fuel_low | 8 | fuel_level_pct < порогов |

**Степень штрафа:**
- Метрика в зоне warning → penalty = weight × 0.5
- Метрика в зоне critical → penalty = weight × 1.0

**Статусы:**
- 85–100 → `Good`
- 60–84 → `Warning`
- < 60 → `Critical`

**Пороги** (хранятся в БД, PATCH /thresholds):

KZ8A:
| Метрика | Warning | Critical | Направление |
|---------|---------|----------|------------|
| main_transformer_temp_c | 90°C | 110°C | upper |
| traction_converter_temp_c | 80°C | 100°C | upper |
| catenary_voltage_kv | 21 kV | 19 kV | lower |
| brake_system_pressure_bar | 4.0 bar | 3.0 bar | lower |
| main_transformer_load_pct | 85% | 95% | upper |
| traction_converter_load_pct | 85% | 95% | upper |
| speed_kmh | 140 | 160 | upper |

TE33A:
| Метрика | Warning | Critical | Направление |
|---------|---------|----------|------------|
| engine_load_pct | 85% | 95% | upper |
| engine_rpm | 1900 | 2100 | upper |
| fuel_level_pct | 25% | 15% | lower |
| brake_system_pressure_bar | 4.0 bar | 3.0 bar | lower |
| fuel_consumption_lph | 350 l/h | 450 l/h | upper |
| speed_kmh | 120 | 140 | upper |

### 4.5. Alert Service

- Отслеживает каждую метрику каждого локомотива против порогов
- При пересечении порога → создаёт AlertItem (uuid, severity, title, message, component, metric, value, threshold)
- При возврате в норму → resolved
- Хранит в памяти (для скорости) + в PostgreSQL (persistence)
- Максимум 200 активных алертов на запрос

### 4.6. Role View Builder

Строит готовые view-пакеты для каждой роли:

**Машинист (driver):**
- health_index, speed_kmh, traction_mode (TRACTION/IDLE/REGENERATIVE_BRAKING), brake_status, main_alert, recommended_action

**Диспетчер (dispatcher):**
- health_index, speed_kmh, position_km, track_segment_id, communication_status, fault_code, alert_count, incident_priority_score, mission_readiness, operational_status_summary, route

**Инженер (engineer):**
- Полная нормализованная телеметрия + полные processed analytics (все sub-scores, root_cause_candidates, top_factors)

**Руководитель (supervisor):**
- Fleet entry: health_index, availability_score, downtime_risk_score, maintenance_priority_score, criticality_rank, fleet_health_contribution + model-specific statuses

### 4.7. Subscription Manager

Управляет WebSocket подписками:
- Клиент шлёт `{ type: 'subscribe', payload: { role, locomotive_ids } }`
- Индексирование по role и по locomotiveId для эффективного broadcast
- Если locomotive_ids пусто → подписка на все ('*')
- Поддерживает unsubscribe при disconnect

---

## 5. Взаимодействие между сервисами

### 5.1. Locomotive → Normalization (RabbitMQ)

```
Exchange: telemetry (topic, durable)

Events:
  telemetry.raw.received    — Locomotive publishes → Normalization consumes
  telemetry.raw.invalid     — Locomotive publishes (невалидная телеметрия)
  telemetry.normalized.created  — Normalization publishes
  health.snapshot.updated       — Normalization publishes
  role.view.updated             — Normalization publishes
```

**Формат события telemetry.raw.received:**
```json
{
  "event": "telemetry.raw.received",
  "locomotive_id": "KZ8A-001",
  "model": "KZ8A",
  "timestamp_utc": "2026-04-04T10:00:00.000Z",
  "received_at": "2026-04-04T10:00:00.123Z",
  "payload": { ... полный raw telemetry объект ... }
}
```

### 5.2. Normalization → Frontend (WebSocket)

WebSocket-сервер на порте 8086 (API Gateway проксирует :8080/ws → :8086/ws).

**Протокол:** см. секцию 7.

---

## 6. База данных

Одна PostgreSQL БД `realtime_ktzh`, две schema:

### 6.1. Schema `locomotive`

| Таблица | Назначение |
|---------|------------|
| `locomotive_models` | Справочник моделей (KZ8A, TE33A), PK: code |
| `metric_schemas` | Метрики каждой модели (field_name, data_type, unit, min, max) |
| `locomotives` | Реестр локомотивов (id, model_code, status, track_segment_id, position_km) |
| `telemetry_raw` | Сырая телеметрия (JSONB payload), индекс по locomotive_id+timestamp |
| `fault_events_raw` | Извлечённые fault-события |
| `_migrations` | Tracking применённых миграций |

### 6.2. Schema `normalization`

| Таблица | Назначение |
|---------|------------|
| `telemetry_normalized` | Нормализованная телеметрия (metrics JSONB) |
| `derived_metrics` | Processed analytics (health_index, payload JSONB с sub-scores) |
| `health_snapshots` | Снимки health index (для replay) |
| `threshold_configs` | Configurable пороги (model_code, metric, warning, critical, direction) |
| `weight_configs` | Configurable веса health index (model_code, factor, weight) |
| `alerts` | Алерты (severity, component, metric, value, threshold, acknowledged, resolved_at) |
| `_migrations` | Tracking |

---

## 7. WebSocket протокол

### 7.1. Подключение

```
ws://localhost:8086/ws           (прямое)
ws://localhost:8080/ws           (через API Gateway)
```

### 7.2. Клиент → Сервер

**Subscribe (обязательно первым):**
```json
{
  "type": "subscribe",
  "payload": {
    "role": "driver",
    "locomotive_ids": ["KZ8A-001"]
  }
}
```

**Ping (heartbeat каждые 15с):**
```json
{ "type": "ping" }
```

### 7.3. Сервер → Клиент

| type | payload | Частота | Кому |
|------|---------|---------|------|
| `snapshot_init` | `{ role, locomotives: [{ telemetry, processed, alerts, route }] }` | 1 раз при subscribe | Подписавшемуся |
| `telemetry_update` | LocomotiveTelemetry (KZ8A или TE33A) | ~1с | По locomotive_id |
| `processed_update` | LocomotiveProcessed (KZ8A или TE33A) | ~8с | По locomotive_id |
| `alert_created` | AlertItem | При срабатывании | По locomotive_id |
| `alert_resolved` | `{ id, locomotive_id }` | При возврате в норму | По locomotive_id |
| `fleet_summary_update` | FleetEntry[] | ~15с | supervisor |
| `dispatcher_overlay_update` | DispatcherOverlay | По событию | dispatcher |
| `locomotive_status_update` | StatusUpdate | По событию | Все |
| `pong` | null | На ping | Отправителю |

---

## 8. Health Index

### 8.1. Формула

```
health_index = max(0, min(100, 100 - sum(penalties)))
```

Где penalty для каждого фактора:
- Метрика в `warning` зоне → `weight × 0.5`
- Метрика в `critical` зоне → `weight × 1.0`

### 8.2. Пример расчёта KZ8A

```
Transformer temp = 95°C (warning threshold 90°C)  → penalty = 15 × 0.5 = 7.5
Brake pressure = 2.8 bar (critical threshold 3.0)  → penalty = 15 × 1.0 = 15
Fault code = 'E-TX-01'                             → penalty = 20
Остальное в норме                                  → 0

health_index = 100 - (7.5 + 15 + 20) = 57.5 → 58 (округлено)
health_status = 'Critical' (< 60)

top_factors = [
  { name: 'active_fault', impact: 20, detail: 'Fault: E-TX-01' },
  { name: 'brake_pressure_low', impact: 15, detail: 'Brake pressure 2.8 bar' },
  { name: 'transformer_temp_high', impact: 7.5, detail: 'Transformer temp 95°C' }
]
```

### 8.3. Configurable без перекомпиляции

- `PATCH /thresholds` — поменять пороги
- `PATCH /weights` — поменять веса
- Кэш обновляется каждые 30 секунд + сразу после PATCH

---

## 9. Как запускать

### 9.1. Предварительно

1. **PostgreSQL** запущен на localhost:5432, БД `realtime_ktzh` создана
2. **RabbitMQ** запущен на localhost:5672

```bash
# Создать БД (если не создана)
createdb realtime_ktzh
```

### 9.2. Locomotive Service

```bash
cd server/locomotive
cp .env.example .env        # при необходимости отредактировать
npm install
npm run dev                 # или npm start
```

При запуске автоматически:
- Создаст schema `locomotive`
- Прогонит миграции (создание таблиц)
- Засидит модели KZ8A/TE33A и metric_schemas
- Подключится к RabbitMQ
- Запустится на порту 8083

### 9.3. Normalization Service

```bash
cd server/normalization
cp .env.example .env        # при необходимости отредактировать
npm install
npm run dev                 # или npm start
```

При запуске автоматически:
- Создаст schema `normalization`
- Прогонит миграции
- Засидит дефолтные пороги и веса
- Подключится к RabbitMQ (consumer)
- Запустит REST API на порту 8085
- Запустит WebSocket сервер на порту 8086

---

## 10. API Reference

### 10.1. Locomotive Service (порт 8083)

#### Locomotives CRUD

```
GET    /locomotives                      — Список (query: status, model_code, limit, offset)
GET    /locomotives/:id                  — По ID
POST   /locomotives                      — Создать
PATCH  /locomotives/:id                  — Обновить
DELETE /locomotives/:id                  — Удалить
```

**POST /locomotives body:**
```json
{
  "id": "KZ8A-001",
  "model_code": "KZ8A",
  "name": "Электровоз КЗ8А №001",
  "status": "active",
  "track_segment_id": "seg-astana-karaganda-1",
  "position_km": 45.2
}
```

#### Telemetry

```
POST   /telemetry/raw                    — Приём одного пакета
POST   /telemetry/bulk                   — Приём массива (до 1000)
GET    /telemetry/raw/:locomotiveId      — История (query: from, to, limit)
GET    /telemetry/raw/:locomotiveId/latest — Последний пакет
```

**POST /telemetry/raw body (KZ8A):**
```json
{
  "locomotive_id": "KZ8A-001",
  "locomotive_model": "KZ8A",
  "timestamp_utc": "2026-04-04T10:00:00.000Z",
  "speed_kmh": 82.4,
  "pantograph_status": "ok",
  "catenary_voltage_kv": 24.7,
  "catenary_current_a": 450,
  "main_transformer_status": "ok",
  "main_transformer_temp_c": 71.2,
  "main_transformer_load_pct": 65,
  "tractive_effort_kn": 180,
  "traction_drive_status": "ok",
  "traction_converter_status": "ok",
  "traction_converter_temp_c": 55,
  "traction_converter_load_pct": 60,
  "regenerative_braking_status": "ok",
  "regenerative_braking_power_kw": 0,
  "electrical_brake_status": "ok",
  "brake_system_status": "ok",
  "brake_system_pressure_bar": 5.8,
  "automatic_pilot_status": "ok",
  "energy_meter_kwh": 12450,
  "energy_consumption_kw": 2800,
  "fault_code": null,
  "communication_status": "online",
  "control_system_status": "ok",
  "track_segment_id": "seg-001",
  "position_km": 45.2
}
```

**POST /telemetry/raw body (TE33A):**
```json
{
  "locomotive_id": "TE33A-001",
  "locomotive_model": "TE33A",
  "timestamp_utc": "2026-04-04T10:00:00.000Z",
  "speed_kmh": 75.0,
  "engine_status": "ok",
  "engine_rpm": 1500,
  "engine_load_pct": 70,
  "fuel_level_pct": 65,
  "fuel_consumption_lph": 200,
  "propulsion_system_status": "ok",
  "dynamic_brake_status": "ok",
  "brake_system_status": "ok",
  "brake_system_pressure_bar": 5.5,
  "compressor_status": "ok",
  "auxiliaries_status": "ok",
  "onboard_diagnostic_status": "ok",
  "remote_diagnostic_alert": null,
  "crew_interface_status": "ok",
  "computer_system_status": "ok",
  "communications_status": "online",
  "fault_code": null,
  "communication_status": "online",
  "control_system_status": "ok",
  "track_segment_id": "seg-002",
  "position_km": 120.5
}
```

#### Models

```
GET    /models                           — Список моделей
GET    /models/:model/schema             — Metric schema модели
```

#### Health

```
GET    /health                           — Health check сервиса
```

### 10.2. Normalization Service (порт 8085)

#### Health & Snapshots

```
GET    /health-index/:locomotiveId       — Текущий health index
GET    /snapshots/:locomotiveId          — Полный snapshot (telemetry + processed + alerts)
GET    /history/:locomotiveId            — История derived metrics (query: from, to, limit)
GET    /replay/:locomotiveId?minutes=5   — Replay за последние 5-15 мин
```

#### Role Views

```
GET    /role-view/driver/:locomotiveId      — View для машиниста
GET    /role-view/dispatcher/:locomotiveId  — View для диспетчера
GET    /role-view/engineer/:locomotiveId    — View для инженера
GET    /role-view/supervisor                — Fleet overview для руководителя
```

#### Config (пороги и веса — без перекомпиляции)

```
GET    /thresholds                       — Все пороги (query: model_code)
PATCH  /thresholds                       — Обновить порог
GET    /weights                          — Все веса (query: model_code)
PATCH  /weights                          — Обновить вес
```

**PATCH /thresholds body:**
```json
{
  "model_code": "KZ8A",
  "metric": "main_transformer_temp_c",
  "warning": 85,
  "critical": 105,
  "direction": "upper"
}
```

**PATCH /weights body:**
```json
{
  "model_code": "KZ8A",
  "factor": "transformer_thermal",
  "weight": 18
}
```

#### Health check

```
GET    /health                           — Health check + wsConnections count
```

---

## 4 слоя данных (как в спецификации)

| Layer | Где хранится | Кто создаёт |
|-------|-------------|-------------|
| **Layer 1: Raw telemetry** | `locomotive.telemetry_raw` | Locomotive Service |
| **Layer 2: Normalized telemetry** | `normalization.telemetry_normalized` | Normalization pipeline |
| **Layer 3: Processed / derived** | `normalization.derived_metrics` + `health_snapshots` | Health Calculator |
| **Layer 4: Role view** | In-memory → WebSocket push / REST | Role View Builder |

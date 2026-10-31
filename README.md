# 🦛 HippoHealth: Precision Clinical AI & Diagnostic Ecosystem

HippoHealth is a multi-platform digital health ecosystem bridging patient care with precision AI. The repo contains a **Next.js 16 Web Client**, a **bare React Native Mobile App** with Google Health Connect integration, an **Express.js 5 Main Backend** (REST + WebSocket), and a **FastAPI AI Diagnostic Service** running 6 deep-learning / machine-learning models.

> **Note:** There is no `chatbot/` directory, no `start_all_backends.bat`, and no MedGemma / LibreChat servers in this snapshot. The backend retains a legacy proxy route `ALL /api/chatbot/* → http://127.0.0.1:8001`, but nothing listens on port 8001. Clinical chat is served by the Express backend itself (Groq `openai/gpt-oss-120b` + OpenCode Zen / DeepSeek + Deepgram).

---

## 🗺️ Project Architecture & Components

Multi-workspace codebase rooted at `E:\Codes\build_for_billions`:

```mermaid
graph TD
    A[Next.js Frontend - Port 3000] -->|Proxy /api/...path| B[Express Main Backend - Port 5000]
    A -->|NextAuth Credentials| B
    C[React Native App] -->|POST /api/health/sync + /api/auth/login| B
    B -->|Proxy /api/models/*| D[FastAPI AI Models - Port 8000]
    B -->|Legacy proxy /api/chatbot/*| E[Unused - Port 8001]
    B -->|Drizzle ORM + pg Pool| G[(PostgreSQL - hippohealth)]
    B -->|S3 API| H[Cloudflare R2 Bucket - onbillo]
    B -->|Agents SDK| I[Groq openai/gpt-oss-120b]
    B -->|fetch zen/v1/chat/completions| J[OpenCode Zen / DeepSeek]
    B -->|Deepgram nova-2| K[Speech-to-Text for Conversations]
    B -->|WS /ws/chat| L[Doctor-Patient Realtime Chat]
```

| Component | Path | Port | Runtime |
|---|---|---|---|
| Web Client | [`frontend/`](./frontend) | 3000 | Next.js 16.2.12, React 19.2.4, Tailwind CSS 4, next-auth 4.24.15 |
| Mobile App | [`app/`](./app) | — (device) | React Native 0.86.2 (bare CLI), React 19.2.3, `react-native-health-connect` 3.5.3 |
| Main Backend | [`backend/`](./backend) | 5000 | Express 5.2.1 ESM, `ws` 8.22.0, Drizzle ORM 0.45.2, `pg` 8.22.0 |
| AI Models | [`ai_models/`](./ai_models) | 8000 | FastAPI + uvicorn, torch, ultralytics YOLO, XGBoost, TorchXRayVision |

### 1. [`frontend/`](./frontend) — Next.js Web Client (App Router, no `pages/` or `src/`)

* **Auth:** NextAuth Credentials provider → `POST ${BACKEND_URL}/api/auth/login`. Session extended with `{id, role, onboardingComplete}` (`types/next-auth.d.ts`). Routes guarded by `useSession` / `getServerSession`. Signup (`/signup`) validates fullName/email/password/role → `POST /api/register` → auto `signIn`. Onboarding (`/onboarding`) is a 3-step wizard (core profile + live BMI/age validation, emergency phone + avatar upload, role-specific doctor assignment / license + specialization) → `POST /api/onboarding (FormData)`.
* **API proxy:** `app/api/[...path]/route.ts` forwards `GET/POST/PUT/DELETE` to `BACKEND_URL (default http://localhost:5000)/api/<path>`, injects `x-user-id / x-user-role`, preserves `multipart/form-data` via raw stream + `duplex:half`.
* **Shared libs:** `lib/db.ts` (drizzle + `pg.Pool`), `lib/r2.ts` (`S3Client region:auto`, `uploadToR2`, default bucket `onbillo`), `lib/schema.ts` (full Drizzle mirror: users, doctor_profiles, doctor_patients, medical_reports, health_metrics, disease_scans, diet_plans, ai_suggestions, body_map_conditions, chat_contexts, doctor_patient_chats, conversations, ai_chats).
* **Routes (all in `app/`):**
  * `/` — marketing landing (`HeaderNav + HeroSection + MarqueeTicker + CoreServicesGrid + InteractiveFeatureShowcase + DiagnosticSuiteDark + Footer`)
  * `/dashboard` — role-split Patient hub / Doctor EHR entry
  * `/visualize-body` — 2D anatomy `<BodyVisualizer/>`
  * `/detect-disease` — `<DiseaseDetector/>` workbench
  * `/chat-with-hippo` — `<HippoChat fullHeight/>`
  * `/chat` — secure Doctor↔Patient chat (`?doctorId=` / `?patientId=`, WebSocket)
  * `/health-metrics` — wearable telemetry vault
  * `/medical-history` — Medical Vault (scans + reports + timeline)
  * `/tasks-diet` — tasks + diet plans (patient-only nav)
  * `/manage-doctors` — care-team directory (PATIENT-only)
  * `/conversations` — recorded consultation vault (PATIENT-only)
  * `/login`, `/signup`, `/onboarding`
  * `/hipaa-compliance`, `/privacy-policy`, `/terms-of-clinical-use` (public legal pages)
  * `/api/auth/[...nextauth]`, `/api/[...path]`
* **UI system:** cream `#F6F4EF` / ink `#1C1B18` / gold `#8C6B1F`, dark-mode vars in `globals.css`, `Material Symbols Outlined`, `HeaderNav` with grouped dropdowns, `ClickSpark`, `ThemeInitializer`, `SpecularButton`, Three.js (`three`, `@react-three/fiber/drei/rapier`), `motion`, `gsap`, `lucide-react`, `@phosphor-icons/react`.

### 2. [`app/`](./app) — React Native Mobile App (bare CLI, NOT Expo)

* **2-file monolith:** `App.tsx` (1079 lines, all UI + logic) + `LoginScreen.tsx` (352 lines). No `screens/`, `components/`, or navigator — single `ScrollView` with auth gate.
* **Health Connect:** `react-native-health-connect` (`initialize`, `getSdkStatus`, `requestPermission`, `readRecords`, `insertRecords`). `AndroidManifest.xml` declares ~32 `android.permission.health.*` + `PermissionsRationaleActivity` / `ViewPermissionUsageActivity` (Android 14+).
* **Reads 15 types** (`recordTypesToRead`): Steps, Distance, ActiveCaloriesBurned, TotalCaloriesBurned, HeartRate, OxygenSaturation, SleepSession, Weight, Height, Hydration, BloodGlucose, BloodPressure, Nutrition, MenstruationFlow, OvulationTest. `PERMISSIONS` requests 21 read/write entries.
* **Writes 6 types via UI:** HeartRate, SpO2, Steps, SleepSession, ActiveCaloriesBurned, Distance.
* **Sync engine (manual, not periodic):** `Fetch All Health Data` (`readRecords` 2000-01-01 → now, binary-split retry on bad intervals) → `Sync to Database` → `POST ${API_BASE}/api/health/sync {healthData}` with `Bearer <JWT>`. Backend aggregates only 6 fields (steps, calories, distance, HR avg/min/max, SpO2, sleep minutes) into `health_metrics` with `source=HEALTH_CONNECT`. `TotalCaloriesBurned, Weight, Height, Hydration, Nutrition, Glucose, BP, Menstruation, Ovulation` are read on-device but dropped in aggregation.
* **Auth:** `LoginScreen` → `POST /api/auth/login` → persists `auth_token` + `auth_user` in `AsyncStorage`. `API_BASE` is hardcoded in both `App.tsx:25` and `LoginScreen.tsx:17` (ngrok URL) and ignores `app/.env.example` (`API_BASE=http://10.0.2.2:5000`).

### 3. [`backend/`](./backend) — Express API Server (port `5000`, REST + WS)

* **Boot:** `http.createServer(app)` + `initChatWebSocket(server)`. `initDb()` tries `ensureDatabaseExists()` (fallback `postgres`/`template1`, `CREATE DATABASE`) → `migrate()` → `seedInitialDoctors()` (3 verified doctors: Cardiology, General Surgery, Occupational Medicine). Server listens even on DB fail.
* **Auth flavors:** `authenticateToken` (Bearer JWT, `health/sync`, `upload/profile-image`), `authenticateProxyUser` (`x-user-id`/`x-user-role` from Next.js proxy, most `/api/*`), `auth()` (`x-user-id` only, tasks/diet), `authenticateUser` (proxy-header preferred, JWT fallback, health), and no-auth `resolveAiChatUserId` (query/body/header) for Hippo chat.
* **Database:** Drizzle + `pg.Pool`, 15 tables (`users`, `doctor_profiles`, `doctor_patients`, `medical_reports`, `health_metrics`, `disease_scans`, `diet_plans`, `tasks`, `task_history`, `ai_suggestions` [defined, unused], `body_map_conditions`, `chat_contexts` [unused], `doctor_patient_chats`, `conversations`, `ai_chats`), enums for role, gender, blood_group, scan_type (`BONE_FRACTURE|BRAIN_TUMOR|ECG|HEART|SKIN|CHEST`), scan_status, report_type, health_metric_source, diet_plan_status, task_type, goal_metric, etc. Migrations in `drizzle/0000–0002`. `body_parts.json` maps stages 1–13.
* **File uploads (multer memory + R2 S3 API):** `uploadToR2(buffer, name, mime, folder)` → `${R2_PUBLIC_URL}/${key}` (default bucket `onbillo`). Endpoints: `POST /api/upload/profile-image` (10 MB, `image/*`), `POST /api/upload/`, `POST /api/onboarding` (`profile-images`), `POST /api/scans` (20 MB → `disease-scans`), `POST /api/medical-reports` (→ `medical-reports`), `POST /api/user/profile-image`, `POST /api/conversations/record` (→ `conversation-audio`).
* **AI integrations:**
  * Groq via OpenAI-compatible (`OPENAI_BASE_URL=https://api.groq.com/openai/v1`, `OPENAI_MODEL=openai/gpt-oss-120b`) + `@openai/agents` SDK — Hippo chat (6 DB tools) + Task Planner.
  * OpenCode Zen (`POST https://opencode.ai/zen/v1/chat/completions`, `OPENCODE_ZEN_MODEL=deepseek-v4-flash-free`) — scan explanations (`ai_explanation, ai_suggestions[], medicines[], affected_parts[1-13]`) and report summaries, diet generation.
  * Deepgram (`nova-2`, `smart_format`) + Groq chat completions — conversation transcription → `{summary, medications[]}`.
* **Proxies:** `ALL /api/models/* → MODELS_URL||http://127.0.0.1:8000` (strips `/models` prefix, streams multipart/JSON). `ALL /api/chatbot/* → NEXT_PUBLIC_CHATBOT_URL||http://127.0.0.1:8001` (legacy, no server here).

### 4. [`ai_models/`](./ai_models) — FastAPI AI Models (port `8000`)

FastAPI `AI Digital Twin Medical Models API v1.0`, CORS `*`, Swagger at `/docs`. Run via `uvicorn app:app --port 8000 --reload` or `python app.py`.

| # | Model | Type | File | Endpoint |
|---|---|---|---|---|
| 1 | Bone Fracture Detection | YOLO classification | `models/best_fracture_classifier.pt` (~3.2 MB) | `POST /predict/bone` (multipart `file` → `{diagnosis, confidence 0-100}`) |
| 2 | Brain Tumor Detection | YOLO object detection (`conf=0.25`) | `models/best_brain_tumor_model.pt` (~5.6 MB) | `POST /predict/brain` (multipart `file` → `{detections[{class, confidence, bbox}], tumor_found}`) |
| 3 | ECG Arrhythmia (5-class) | Custom 1D-CNN (`Conv1d 1→32→64, Linear 64*43→128→5`) | `models/best_ecg_model.pth` (~1.5 MB) | `POST /predict/ecg` (JSON `{signal: 187 floats}` → `{diagnosis, class_id, confidence}`) |
| 4 | Heart Disease Risk | XGBoost | `models/heart_xgb_model.json` | `POST /predict/heart` (JSON 13 fields: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal → `{risk_prediction 0/1, disease_probability, diagnosis}`) |
| 5 | Chest X-Ray Pathology (18-label) | DenseNet121 TorchXRayVision (`densenet121-res224-all`, auto-download) | — (downloaded) | `POST /predict/chest` (multipart `file` → `{pathology_probabilities{...: 0-100}}`) |
| 6 | Skin Disease (Benign_tumors, Eczema, Psoriasis, Seborrh_Keratoses, SkinCancer) | YOLO classification | `models/best.pt` (~3.2 MB) | `POST /predict/skin` (multipart `file` → `{diagnosis, confidence}`) |

Plus `GET /` health check. `test_api.py` exercises all 6 (note: it points at `http://localhost:7860` and hardcoded local training paths).

---

## 🚀 Core Features (actually implemented)

### 🩺 Interactive AI Diagnostic Suite (`/detect-disease` → `DiseaseDetector.tsx`)

* Sidebar picker for all 6 models with per-model inputs: image drag-drop + preview (bone/chest/brain/skin), synthetic ECG presets (normal/PVC/supraventricular, 187-pt + sparkline SVG + raw textarea validation), 13-field heart form (sliders/selects + Alpha Low / Beta High presets).
* `POST /api/models/predict/<model>` → `POST /api/scans {scanType, predictionResult, modelInputMetadata, file}` → merged OpenCode Zen explanation.
* Results: confidence bars, tumor YES/NO + rescaled bounding boxes (brain), sorted pathology list (chest), risk + probability (heart), AI insights (explanation, affected parts via `STAGE_NAME_MAP 1-13`, meds, care instructions).

### 🦴 2D Anatomical Body Visualizer (`/visualize-body` → `BodyVisualizer.tsx`)

* **13 detailed stages:** 1 Skeleton, 2 Circulatory, 3 Urinary, 4 Digestive, 5 Gallbladder, 6 Liver, 7 Diaphragm, 8 Heart, 9 Lungs, 10 Brain, 11 Eyes, 12 Muscles, 13 Skin (+ 5 keyframe groups: Bone, Circulatory, Internal Organs, Muscular, Full Body). PNG layers in `public/human_body_parts/`.
* Viewer: quick-select pills, glow, organ selector (9 organs on stages 3–11), stacked opacity/scale transitions, pulse/hover tooltips, click-to-filter, 1.8 s autoplay, prev/next.
* `PartTimelinePanel`: `GET /api/medical-history` matched by `affectedParts` + keyword fallback (heart→cardiac/ecg, lungs→pulmonary, etc.), scan (purple) + report (sky) cards. `ReportNewProblemForm`: `POST /api/medical-reports {selectedPartId/Name/Stage, fromVisualizeBody:true}` with image/PDF preview.

### 💬 Dual Chat System

* **Hippo AI (`/chat-with-hippo` → `HippoChat.tsx`):** `POST /api/chat {message, history, patientId}`, `GET/DELETE /api/chat/history`, `GET /api/chat/status`. Groq agent with 6 DB tools (profile, metrics, tasks, reports, history, detected diseases), last-10 `ai_chats` + rolling `chat_summary`, markdown renderer, 4 quick prompts, thinking indicator, timestamps.
* **Doctor–Patient (`/chat`):** sidebar (doctor: `GET /api/doctor/patients` filtered by assignment; patient: `GET /api/patient/doctors`), `GET/POST /api/chat/doctor-patient`, realtime `WS /ws/chat` (`join` + `new_message` broadcast, 3 s reconnect, dedupe, date separators, `NO_DOCTOR_ASSIGNED → /manage-doctors` CTA).

### 📊 Health Connect Smartwatch Sync (`/health-metrics` + mobile `app/`)

* Web: `GET /api/health/metrics`. 6 cards (Heart range, SpO2, Steps + km, Sleep hrs + mins, Calories, Distance), `Database Telemetry History` table with `HEALTH_CONNECT` vs `MANUAL` badges, `Sync Sample Telemetry` + `Log Vitals Manually` modal (`POST /api/health/metrics {source:MANUAL}`).
* Mobile: manual `Fetch All Health Data` + `Sync to Database` buttons, 6 writable vitals, console-log pane. No background scheduler.

### 📁 Medical History Vault (`/medical-history`)

* `GET /api/medical-history → {scans[], reports[]}`. Stats bar, `scans|reports|timeline` tabs + search + type filters.
* `ScanCard`: per-type icon/color/status, diagnosis, expandable `aiExplanation, aiSuggestions, medicines, affectedParts, PredictionResultDetails` + raw JSON toggle.
* `ReportCard`: `LAB|IMAGING|PRESCRIPTION|DISCHARGE|OTHER`, AI summary, meds, `extractedData`, R2 `View Report File`.
* `TimelineView`: merged desc sort, `Month Year` groups, gradient line, affected-part + med tags.

### 📋 Patient & Doctor Dashboards (`/dashboard`)

* **Patient:** welcome hero with age/blood/height/weight/BMI pills, Quick Actions (`visualize-body, detect-disease, chat-with-hippo, health-metrics, tasks-diet, chat`), Vitals Grid (Live Sync vs baselines), Recent Scans (4 cards → `/medical-history`), Care Team rail, Clinical Record Snapshot.
* **Doctor EHR (`PatientsDashboard.tsx`):** directory search + assignment dots, workspace tabs `profile | metrics | scans | reports | tasks-diet | conversations | chat`. Can edit patient profile (`POST /api/doctor/update-patient-profile`), add metrics, run model + save scan (`POST /api/models/predict/<model>` → `POST /api/scans`), upload reports (13-stage map), manage tasks/diet, record conversations (`MediaRecorder audio/webm` → `POST /api/conversations/record`), deep-link chat.

### ✅ Tasks & AI Diet Plans (`/tasks-diet`)

* `GET /api/tasks/my + /api/diet/my`, `tasks|diet` toggle. Manual tasks checkbox (`POST /api/tasks/:id/done|undone`, 20-day history), goal tasks (`daily_steps|calories_burn|min_sleep`) with progress + `POST /api/tasks/sync-history/:userId`. Diet: status (`AI_GENERATED|DOCTOR_VERIFIED|ACTIVE`), goals, nutritional targets, daily schedule, `aiRationale`, `doctorNotes`. Backend: `POST /api/tasks/generate-ai/:patientId` (Groq agent), `POST /api/diet/generate/:patientId` + `PUT /api/diet/update-with-ai/:dietId` (OpenCode Zen).

### 🎙️ Conversations (`/conversations`)

* `GET /api/conversations/my → {conversationId, transcription, summary, medication[], audio, doctorName/...}`. Stats, search + doctor filter, `<audio>` (R2) + Direct Audio link, AI Summary, med pills, Deepgram transcription `<details>` + copy.

### 👨‍⚕️ Care Team (`/manage-doctors`)

* `GET /api/patient/doctors`, My Care Team (`POST /api/patient/doctors/toggle-active`) + Add New (`POST /api/patient/doctors/add`), search by name/specialty/hospital.

### 🔐 Auth, Onboarding & Legal

* JWT (30 d) + bcrypt, NextAuth JWT strategy, proxy-header trust, seeded demo doctors, avatar R2 uploads (`POST /api/user/profile-image`, 10 MB), onboarding consent, public `/hipaa-compliance`, `/privacy-policy`, `/terms-of-clinical-use`.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 16.2.12, React 19.2.4, TypeScript 5, Tailwind CSS 4, next-auth 4.24.15, three 0.185.1 + `@react-three/fiber/drei/rapier`, `motion`, `gsap`, `lucide-react`, `@phosphor-icons/react`, `drizzle-orm` + `pg`, `bcryptjs`, `@aws-sdk/client-s3`.
* **Backend:** Express 5.2.1, `ws` 8.22.0, `drizzle-orm` 0.45.2 + `drizzle-kit` 0.31.10 + `pg` 8.22.0, `jsonwebtoken`, `bcryptjs`, `multer` 2.2.0, `@aws-sdk/client-s3`, `@openai/agents` 0.18.0, `zod`, `dotenv`, `cors`.
* **AI service:** FastAPI, uvicorn, `ultralytics`, `torch` 2.0+, `torchvision`, `xgboost`, `pandas`, `numpy`, `torchxrayvision`, `scikit-image`, `scikit-learn`, `python-dotenv`, `python-multipart`, `pydantic`.
* **Mobile:** React Native 0.86.2, React 19.2.3, `react-native-health-connect` 3.5.3, `@react-native-async-storage/async-storage`, `react-native-safe-area-context`, Node ≥ 22.11.
* **Infra/AI APIs:** PostgreSQL, Cloudflare R2 (S3-compatible), Groq OpenAI-compatible (`openai/gpt-oss-120b`), OpenCode Zen (`deepseek-v4-flash-free`), Deepgram `nova-2`.

---

## 🛠️ Installation & Setup

### Prerequisites

* **Node.js** (v22.11+ for mobile; v18+ minimum for web/backend)
* **Python 3.10+** (repo `ai_models/.venv` uses 3.14)
* **PostgreSQL** database
* **Cloudflare R2 bucket** (or S3-compatible)
* **Groq API key** (`GROQ_API_KEY`) — Hippo chat + task planner
* **OpenCode Zen API key** — scan/report/diet summaries
* **Deepgram API token** — hardcoded in `backend/src/routes/conversations.js` for `/api/conversations/record` (replace before production use)
* Android Studio / Xcode for the mobile app

### Environment Configuration

1. **Backend** ([`backend/.env.example`](./backend/.env.example) → `backend/.env`):

   ```env
   PORT=5000
   DATABASE_URL=postgresql://user:password@localhost:5432/hippohealth
   JWT_SECRET=your_jwt_secret_key_here
   GROQ_API_KEY=your_groq_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_BASE_URL=https://api.groq.com/openai/v1
   OPENAI_MODEL=openai/gpt-oss-120b
   R2_BUCKET=onbillo
   R2_PUBLIC_URL=https://pub-yourdomain.r2.dev
   R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   R2_TOKEN_VALUE=your_r2_token_value
   OPENCODE_ZEN_KEY=your_opencode_zen_api_key
   OPENCODE_ZEN_MODEL=deepseek-v4-flash-free
   ```

2. **Frontend** ([`frontend/.env.example`](./frontend/.env.example) → `frontend/.env`):

   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   BACKEND_URL=http://localhost:5000
   NEXT_PUBLIC_API_URL=http://localhost:5000
   DATABASE_URL=postgresql://user:password@localhost:5432/hippohealth
   # R2_* (R2_BUCKET, R2_PUBLIC_URL, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY + NEXT_PUBLIC_R2_PUBLIC_URL)
   ```

3. **AI models** ([`ai_models/.env.example`](./ai_models/.env.example)):

   ```env
   HOST=0.0.0.0
   PORT=8000
   ```

4. **Mobile app** ([`app/.env.example`](./app/.env.example)):
   ```env
   API_BASE=http://10.0.2.2:5000
   ```
   > Current code ignores this file — `API_BASE` is hardcoded in `app/App.tsx:25` and `app/LoginScreen.tsx:17`. Update those constants to your backend URL (LAN IP / ngrok tunnel for devices).

---

## 🏃 Running the Application

No `start_all_backends.bat` exists — run each service manually in its own terminal:

* **Main Express Backend:**

  ```bash
  cd backend
  npm install
  npm run dev
  # optional DB helpers: npm run db:generate / npm run db:push / npm run db:studio
  ```

* **FastAPI AI Models:**

  ```bash
  cd ai_models
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  python app.py
  # or: uvicorn app:app --port 8000 --reload
  # docs: http://localhost:8000/docs
  ```

* **Next.js Frontend:**

  ```bash
  cd frontend
  npm install
  npm run dev
  ```

  Open [http://localhost:3000](http://localhost:3000).

* **Mobile App (React Native CLI):**

  ```bash
  cd app
  npm install
  npm start
  npm run android # or npm run ios
  ```

---

## 🔌 Key API Reference (backend `:5000`)

* Auth: `POST /api/auth/login`, `POST /api/register`, `GET /api/doctors`, `POST /api/onboarding`
* Health: `GET/POST /api/health/metrics`, `POST /api/health/sync`
* Uploads: `POST /api/upload/`, `POST /api/upload/profile-image`, `POST /api/user/profile-image`
* Scans/Reports: `POST /api/scans`, `POST /api/medical-reports`, `GET /api/medical-history`, `GET /api/user/profile`
* Doctor/Patient: `GET /api/doctor/patients`, `POST /api/doctor/update-patient-profile`, `POST /api/doctor/add-patient-metric`, `POST /api/doctor/assign`, `GET /api/patient/doctors`, `POST /api/patient/doctors/add`, `POST /api/patient/doctors/toggle-active`
* Tasks/Diet: `POST /api/tasks/generate-ai/:patientId`, `POST/PUT/DELETE /api/tasks/...`, `GET /api/tasks/my|patient/:id`, `POST /api/tasks/:id/done|undone`, `GET /api/tasks/:id/history`, `POST /api/diet/generate/:patientId`, `PUT /api/diet/update-with-ai/:dietId`, `POST/PUT/DELETE /api/diet/...`, `GET /api/diet/my|patient/:id|:dietId`
* Chat: `POST/GET/DELETE /api/chat[/history]`, `GET /api/chat/status`, `GET/POST /api/chat/doctor-patient`, `WS /ws/chat`
* Conversations: `POST /api/conversations/record`, `GET /api/conversations/my|patient/:patientId|:conversationId`
* Proxies: `ALL /api/models/*` (→ `:8000`), `ALL /api/chatbot/*` (→ `:8001`, legacy/unused)

AI service (`:8000`): `GET /`, `POST /predict/bone|brain|ecg|heart|chest|skin`.

---

## 🗄️ Project Structure

```text
./
├── frontend/          # Next.js 16 App Router (app/, components/, lib/, types/, public/)
│   ├── app/           # dashboard, visualize-body, detect-disease, chat-with-hippo, chat,
│   │                  # health-metrics, medical-history, tasks-diet, manage-doctors,
│   │                  # conversations, login, signup, onboarding, legal, api/
│   ├── components/    # HeaderNav, HeroSection, DiseaseDetector, BodyVisualizer,
│   │                  # HippoChat, PatientsDashboard, ProfileModal, ...
│   ├── lib/           # db.ts, r2.ts, schema.ts
│   └── public/        # logo.png, homepage_images/, human_body_parts/, avatars/
├── backend/           # Express 5 (index.js, src/routes/, src/db/schema.js, src/utils/r2.js)
│   ├── src/routes/    # api.js, auth.js, health.js, chat.js, tasks.js, diet.js, conversations.js
│   ├── src/db/        # index.js, schema.js (15 tables), init.js (seed doctors), body_parts.json
│   └── drizzle/       # 0000_odd_domino.sql, 0001_loving_war_machine.sql, 0002_flawless_leech.sql
├── ai_models/         # FastAPI (app.py, requirements.txt, test_api.py, models/*.pt/.json)
└── app/               # bare React Native CLI (App.tsx, LoginScreen.tsx, android/, ios/)
```

---

## 🛡️ Privacy & HIPAA Compliance

* **Secure Authentication:** JWT (30-day) + bcrypt + NextAuth sessions; proxy-header trust only from the Next.js server; seeded verified doctors.
* **Onboarding Consent:** Patients review **Terms of Clinical Use** and **Privacy Policy** (`/terms-of-clinical-use`, `/privacy-policy`) regarding AI-generated recommendations.
* **HIPAA Guardrails:** `/hipaa-compliance` page stresses AI outputs are assistive / research-only and must be verified by a licensed clinician. Do not commit real secrets (live `backend/.env` and `frontend/.env` in this workspace contain real Groq/R2 keys and must be rotated if shared).

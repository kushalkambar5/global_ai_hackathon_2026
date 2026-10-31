<p align="center">
  <img src="./frontend/public/logo.png" alt="HippoHealth Logo" width="180"/>
</p>

<h1 align="center">HippoHealth</h1>

<p align="center">
  An AI-powered digital health ecosystem combining clinical diagnostics, health monitoring, medical records, and doctor–patient collaboration.
</p>

<p align="center">
  <a href="https://github.com/kushalkambar5/buildforbillions"><img src="https://img.shields.io/github/stars/kushalkambar5/buildforbillions?style=social" alt="GitHub stars"/></a>
  <a href="https://github.com/kushalkambar5/buildforbillions/forks"><img src="https://img.shields.io/github/forks/kushalkambar5/buildforbillions?style=social" alt="GitHub forks"/></a>
  <a href="https://github.com/kushalkambar5/buildforbillions/issues"><img src="https://img.shields.io/github/issues/kushalkambar5/buildforbillions" alt="GitHub issues"/></a>
  <br/>
  <img src="https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black" alt="React Native"/>
</p>

HippoHealth is a multi-platform precision health system for patients, doctors, and clinical AI workflows. It combines a Next.js web app, a React Native mobile app with Google Health Connect, an Express.js REST + WebSocket backend, and a FastAPI service running six diagnostic ML models — backed by PostgreSQL, Cloudflare R2 storage, and LLM APIs for explanations, summaries, and care planning.

---

## 📑 Table of Contents

- [What is HippoHealth?](#-what-is-hippohealth)
- [Demo](#-demo)
- [Project Presentation](#-project-presentation)
- [Key Features](#-key-features)
- [Architecture](#️-architecture)
- [AI Diagnostic Models](#-ai-diagnostic-models)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Running the Project](#️-running-the-project)
- [API Overview](#-api-overview)
- [Project Structure](#-project-structure)
- [Security & Privacy](#-security--privacy)
- [Medical Disclaimer](#️-medical-disclaimer)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🩺 What is HippoHealth?

HippoHealth bridges everyday patient care with precision AI diagnostics in one connected ecosystem:

- **Next.js web application** — patient and doctor dashboards, AI diagnostic workbench, anatomical visualizer, medical vault, tasks/diet plans, and real-time chat.
- **React Native mobile application (bare CLI)** — Google Health Connect integration for wearable telemetry (steps, heart rate, SpO₂, sleep, calories, distance) with manual sync to the backend.
- **Express.js backend** — REST API, WebSocket-based doctor–patient chat, auth, file uploads, and proxying to AI services.
- **FastAPI AI model service** — six deep-learning / machine-learning models for bone fracture, brain tumor, ECG arrhythmia, heart disease risk, chest X-ray pathology, and skin disease.
- **Data & AI layer** — PostgreSQL (via Drizzle ORM + `pg`), Cloudflare R2 (S3-compatible file storage), Groq (`openai/gpt-oss-120b`), OpenCode Zen (`deepseek-v4-flash-free`), and Deepgram (`nova-2`) for transcription.

---

## 🎥 Demo

> 🚧 Demo video coming soon — this section will host the embedded YouTube walkthrough once published.

<!--
Replace the placeholder below with the YouTube embed once the video is published.

Recommended format:

[![HippoHealth Demo](https://img.youtube.com/vi/YOUTUBE_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID)
-->

---

## 📊 Project Presentation

[📑 View Project Presentation](https://docs.google.com/presentation/d/1ry9LYx-d2TbGWDbfAH_nmkB5Wz6R6i6a/edit?usp=sharing&ouid=105178577981616596829&rtpof=true&sd=true)

---

## ✨ Key Features

### 🩺 AI Diagnostic Suite

- Bone fracture detection
- Brain tumor detection with bounding boxes
- ECG arrhythmia classification (5-class)
- Heart disease risk prediction
- Chest X-ray pathology detection (multi-label probabilities)
- Skin disease classification
- AI-generated explanations, care suggestions, medicines, and affected-body-part mapping

### 🧍 Anatomical Body Visualizer

- 13 anatomical stages (skeleton, circulatory, urinary, digestive, gallbladder, liver, diaphragm, heart, lungs, brain, eyes, muscles, skin)
- Interactive 2D visualization with organ selector, autoplay, glow, and tooltips
- Medical-history mapping (scans + reports matched to body parts)
- Report-a-problem flow linked to the selected anatomical part

### 💬 AI & Doctor–Patient Chat

- Hippo AI assistant with access to patient profile, metrics, tasks, reports, and scan history
- Doctor–patient messaging with assignment-aware sidebars
- WebSocket-based real-time communication (`WS /ws/chat`) with reconnect and dedupe

### ❤️ Health Connect Integration

- Wearable health data via `react-native-health-connect`
- Steps, heart rate, SpO₂, sleep, calories, and distance synced to `health_metrics`
- Web vault with telemetry cards, history table (`HEALTH_CONNECT` vs `MANUAL`), sample sync, and manual vitals logging

### 📁 Medical Records

- Medical scans with AI explanations and raw prediction details
- Medical reports with AI summaries and extracted data
- Unified timeline view grouped by month
- Search and type filters
- Conversation records with audio playback, transcription, summary, and medications

### 👨‍⚕️ Doctor Dashboard

- Patient directory with search and assignment status
- Workspace tabs: profile, health metrics, scans, reports, tasks & diet, conversations, chat
- Edit patient profiles, add metrics, run AI models, upload reports
- Record consultations (audio → transcription → summary)

### 🥗 AI Tasks & Diet Plans

- AI-generated tasks (manual + goal-based: steps, calories, sleep)
- AI-generated diet plans with nutritional targets and daily schedules
- Doctor verification workflow (`AI_GENERATED` → `DOCTOR_VERIFIED` → `ACTIVE`)
- Progress tracking and task history

<details>
<summary><strong>Implementation notes (where things live)</strong></summary>

- Diagnostic workbench: `frontend/app/detect-disease` + `frontend/components/DiseaseDetector.tsx` → `POST /api/models/predict/<model>` → `POST /api/scans`.
- Body visualizer: `frontend/app/visualize-body` + `frontend/components/BodyVisualizer.tsx`, layers in `frontend/public/human_body_parts/`, stage map in `backend/src/db/body_parts.json`.
- Hippo chat: `frontend/app/chat-with-hippo` + `frontend/components/HippoChat.tsx` → `POST /api/chat`, history at `/api/chat/history`.
- Doctor–patient chat: `frontend/app/chat` → `GET/POST /api/chat/doctor-patient` + `WS /ws/chat`.
- Health metrics: `frontend/app/health-metrics` → `GET /api/health/metrics`; mobile sync in `app/App.tsx` → `POST /api/health/sync`.
- Vault: `frontend/app/medical-history` → `GET /api/medical-history`.
- Tasks & diet: `frontend/app/tasks-diet` → `GET /api/tasks/my`, `GET /api/diet/my`.
- Conversations: `frontend/app/conversations` → `GET /api/conversations/my`.
- Care team: `frontend/app/manage-doctors` → `GET /api/patient/doctors`.

</details>

---

## 🏗️ Architecture

Requests flow from the Next.js web client (and the React Native app) through the Express backend, which handles auth, persistence, uploads, chat, and LLM calls — and proxies diagnostic inference to the FastAPI AI service.

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

| Component | Technology | Port | Purpose |
|---|---|---|---|
| Web Client | Next.js 16, React 19 | 3000 | Patient/doctor UI, auth, API proxy |
| Main Backend | Express 5, `ws`, Drizzle ORM | 5000 | REST + WebSocket API, uploads, LLM orchestration |
| AI Models | FastAPI, PyTorch, YOLO, XGBoost | 8000 | Diagnostic inference endpoints |
| Mobile App | React Native CLI, Health Connect | device | Wearable data capture + manual sync |
| Database | PostgreSQL | — | Users, scans, reports, metrics, chats, tasks |
| Storage | Cloudflare R2 (S3 API) | — | Avatars, scan files, reports, audio |
| Realtime | WebSockets (`/ws/chat`) | 5000 | Doctor–patient messaging |

> ⚠️ **Legacy route note:** the backend retains a proxy for `ALL /api/chatbot/* → http://127.0.0.1:8001`, but no service listens on port 8001 in this repository. Clinical chat is served by the Express backend itself (Groq + OpenCode Zen + Deepgram).

---

## 🤖 AI Diagnostic Models

FastAPI service (`ai_models/`, Swagger at `GET /docs` when running). Health check at `GET /`.

| Model | Technology | Input | Output |
|---|---|---|---|
| Bone Fracture | YOLO classification (`models/best_fracture_classifier.pt`, ~3.2 MB) | X-ray image (`multipart file`) | Diagnosis + confidence (0–100) |
| Brain Tumor | YOLO object detection, `conf=0.25` (`models/best_brain_tumor_model.pt`, ~5.6 MB) | Brain scan (`multipart file`) | Detections with class, confidence, bbox + `tumor_found` |
| ECG Arrhythmia | Custom 1D-CNN (`Conv1d 1→32→64`, `Linear 64*43→128→5`; `models/best_ecg_model.pth`, ~1.5 MB) | JSON `{signal: 187 floats}` | 5-class diagnosis + `class_id` + confidence |
| Heart Disease | XGBoost (`models/heart_xgb_model.json`) | JSON with 13 clinical fields (age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal) | Risk prediction (0/1), disease probability, diagnosis |
| Chest X-ray | DenseNet121 via TorchXRayVision (`densenet121-res224-all`, auto-downloaded) | X-ray image (`multipart file`) | Pathology probabilities (0–100 per label) |
| Skin Disease | YOLO classification (`models/best.pt`, ~3.2 MB; classes: Benign tumors, Eczema, Psoriasis, Seborrh Keratoses, SkinCancer) | Skin image (`multipart file`) | Diagnosis + confidence |

Endpoints: `POST /predict/bone`, `POST /predict/brain`, `POST /predict/ecg`, `POST /predict/heart`, `POST /predict/chest`, `POST /predict/skin`.

<details>
<summary><strong>Model testing note</strong></summary>

`ai_models/test_api.py` exercises all six models, but it currently points at `http://localhost:7860` and references hardcoded local training paths. Update the base URL to `http://localhost:8000` and adjust paths before running it against this service.

</details>

---

## 🧰 Tech Stack

### Frontend

- Next.js 16.2.12, React 19.2.4, TypeScript 5, Tailwind CSS 4
- `next-auth` 4.24.15 (Credentials provider)
- Three.js + `@react-three/fiber` / `drei` / `rapier`, `motion`, `gsap`, `lucide-react`, `@phosphor-icons/react`

### Backend

- Node.js, Express 5.2.1 (ESM)
- WebSockets (`ws` 8.22.0)
- Drizzle ORM 0.45.2 + `drizzle-kit` + `pg`
- `jsonwebtoken`, `bcryptjs`, `multer`, `zod`, `cors`, `dotenv`

### AI / ML

- Python, FastAPI, Uvicorn, Pydantic
- PyTorch, TorchVision, Ultralytics YOLO, XGBoost, TorchXRayVision
- Pandas, NumPy, scikit-image, scikit-learn

### Mobile

- React Native 0.86.2 (bare CLI, not Expo), React 19.2.3
- `react-native-health-connect` 3.5.3, AsyncStorage, Safe Area Context

### Data & Storage

- PostgreSQL (`hippohealth` database, 15 tables, Drizzle migrations)
- Cloudflare R2 (S3-compatible; default bucket `onbillo`)

### AI APIs

- Groq OpenAI-compatible (`openai/gpt-oss-120b`) via `@openai/agents` SDK
- OpenCode Zen (`deepseek-v4-flash-free`) for scan/report/diet explanations
- Deepgram (`nova-2`) for conversation transcription

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** — v18+ minimum for web/backend; v22.11+ required for the mobile app
- **Python 3.10+** for the AI service
- **PostgreSQL** database
- **Cloudflare R2 bucket** (or any S3-compatible storage)
- **Groq API key** (`GROQ_API_KEY`) — Hippo chat + task planner
- **OpenCode Zen API key** (`OPENCODE_ZEN_KEY`) — scan/report/diet summaries
- **Deepgram API token** — conversation transcription
- Android Studio / Xcode for the mobile app

### 1. Clone the repository

```bash
git clone https://github.com/kushalkambar5/buildforbillions.git
cd buildforbillions
```

### 2. Configure environment variables

Copy each example file and fill in your own values. Never commit real secrets.

**Backend** (`backend/.env.example` → `backend/.env`):

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

**Frontend** (`frontend/.env.example` → `frontend/.env`):

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
DATABASE_URL=postgresql://user:password@localhost:5432/hippohealth
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=hippohealth-bucket
R2_PUBLIC_URL=https://pub-yourdomain.r2.dev
R2_TOKEN_VALUE=your_r2_token_value
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-yourdomain.r2.dev
```

**AI service** (`ai_models/.env.example`):

```env
HOST=0.0.0.0
PORT=8000
```

**Mobile app** (`app/.env.example`):

```env
API_BASE=http://10.0.2.2:5000
```

> ⚠️ **Mobile config warning:** the app currently ignores `app/.env.example` — `API_BASE` is hardcoded in `app/App.tsx` and `app/LoginScreen.tsx`. Update those constants to your backend URL (LAN IP or tunnel URL for physical devices).

> ⚠️ **Secrets warning:** never commit populated `.env` files. Rotate any credentials that were ever committed or shared.

---

## ▶️ Running the Project

There is no single start script — run each service in its own terminal.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| AI service docs | http://localhost:8000/docs |

**Backend (Express, port 5000):**

```bash
cd backend
npm install
npm run dev
# optional DB helpers:
# npm run db:generate
# npm run db:push
# npm run db:studio
```

On boot the backend attempts to ensure/create the database, run migrations, and seed three verified demo doctors (Cardiology, General Surgery, Occupational Medicine). The server still listens even if the DB connection fails — check logs if data endpoints error.

**AI service (FastAPI, port 8000):**

```bash
cd ai_models
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
# or: uvicorn app:app --port 8000 --reload
```

**Frontend (Next.js, port 3000):**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

**Mobile app (React Native CLI):**

```bash
cd app
npm install
npm start
npm run android # or: npm run ios
```

---

## 🔌 API Overview

Backend base URL: `http://localhost:5000`. The Next.js route `app/api/[...path]/route.ts` proxies `/api/*` to the backend and injects `x-user-id` / `x-user-role`.

Categories: **Authentication · Health · Uploads · Scans & Reports · Doctor / Patient · Tasks & Diet · Chat · Conversations · AI Service · Proxies**

<details>
<summary><strong>View API endpoints</strong></summary>

- **Auth:** `POST /api/auth/login`, `POST /api/register`, `GET /api/doctors`, `POST /api/onboarding`
- **Health:** `GET /api/health/metrics`, `POST /api/health/metrics`, `POST /api/health/sync`
- **Uploads:** `POST /api/upload/`, `POST /api/upload/profile-image`, `POST /api/user/profile-image`
- **Scans / Reports:** `POST /api/scans`, `POST /api/medical-reports`, `GET /api/medical-history`, `GET /api/user/profile`
- **Doctor / Patient:** `GET /api/doctor/patients`, `POST /api/doctor/update-patient-profile`, `POST /api/doctor/add-patient-metric`, `POST /api/doctor/assign`, `GET /api/patient/doctors`, `POST /api/patient/doctors/add`, `POST /api/patient/doctors/toggle-active`
- **Tasks / Diet:** `POST /api/tasks/generate-ai/:patientId`, `POST / PUT / DELETE /api/tasks/...`, `GET /api/tasks/my`, `GET /api/tasks/patient/:id`, `POST /api/tasks/:id/done`, `POST /api/tasks/:id/undone`, `GET /api/tasks/:id/history`, `POST /api/diet/generate/:patientId`, `PUT /api/diet/update-with-ai/:dietId`, `POST / PUT / DELETE /api/diet/...`, `GET /api/diet/my`, `GET /api/diet/patient/:id`, `GET /api/diet/:dietId`
- **Chat:** `POST /api/chat`, `GET /api/chat/history`, `DELETE /api/chat/history`, `GET /api/chat/status`, `GET /api/chat/doctor-patient`, `POST /api/chat/doctor-patient`, `WS /ws/chat`
- **Conversations:** `POST /api/conversations/record`, `GET /api/conversations/my`, `GET /api/conversations/patient/:patientId`, `GET /api/conversations/:conversationId`
- **AI service (`:8000`):** `GET /`, `POST /predict/bone`, `POST /predict/brain`, `POST /predict/ecg`, `POST /predict/heart`, `POST /predict/chest`, `POST /predict/skin`
- **Proxies:** `ALL /api/models/*` → `MODELS_URL` (default `http://127.0.0.1:8000`); `ALL /api/chatbot/*` → legacy `:8001` (unused, no server in this repo)

</details>

---

## 📁 Project Structure

```text
hippohealth/
├── frontend/      # Next.js web application
├── backend/       # Express API + WebSocket server
├── ai_models/     # FastAPI ML inference service
└── app/           # React Native mobile application
```

<details>
<summary><strong>View detailed structure</strong></summary>

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

</details>

---

## 🔐 Security & Privacy

- **Authentication:** JWT (30-day expiry) + bcrypt password hashing + NextAuth (JWT strategy, Credentials provider). The Next.js API proxy injects `x-user-id` / `x-user-role`, which the backend trusts for most `/api/*` routes.
- **Storage:** PostgreSQL for structured data; Cloudflare R2 (S3-compatible) for avatars, scans, reports, and conversation audio.
- **Uploads:** `multer` memory storage with size limits (e.g. 10 MB profile images, 20 MB scans) before streaming to R2.
- **Secrets:** all credentials live in environment variables (`backend/.env`, `frontend/.env`, `ai_models/.env`, `app/.env.example`). Never commit populated `.env` files.
- **Consent & legal pages:** public `/terms-of-clinical-use`, `/privacy-policy`, and `/hipaa-compliance` pages; onboarding includes consent review.

> ⚠️ HippoHealth includes a dedicated HIPAA/compliance information page and security-oriented controls, but this repository should not be interpreted as independently certified HIPAA-compliant.

---

## ⚠️ Medical Disclaimer

HippoHealth is an AI-assisted healthcare technology project intended for research, educational, and decision-support purposes. AI-generated predictions, explanations, and recommendations are **not** a substitute for professional medical diagnosis or treatment. Clinical decisions must be made by qualified healthcare professionals. No regulatory or clinical validation is claimed.

---

## 🗺️ Roadmap

Planned / future ideas (not currently implemented):

- [ ] Production deployment
- [ ] Automated testing expansion
- [ ] Background health synchronization (mobile sync is currently manual)
- [ ] Improved model evaluation
- [ ] Expanded clinical datasets

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-change`).
3. Make your changes.
4. Run linting where available (`npm run lint` in `frontend/` and `app/`).
5. Commit your changes with a clear message.
6. Open a pull request describing what changed and why.

> Note: `backend` currently has no real test script (`npm test` exits with an error), and `app` uses `jest`/`eslint` via its React Native toolchain. Do not commit secrets or `.env` files.

---

## 📄 License

This project does not currently include a license. Please contact the maintainers before using, modifying, or redistributing the code.

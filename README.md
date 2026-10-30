# 🦛 HippoHealth: Precision Clinical AI & Diagnostic Ecosystem

HippoHealth is a state-of-the-art, multi-platform digital health ecosystem designed to bridge patient care with precision artificial intelligence. The repository contains a complete clinical suite featuring **Next.js Web Client**, a **React Native Mobile App** with Google Health Connect integration, an **Express.js Main Backend**, a **FastAPI AI Diagnostic Service** running 6 deep learning/machine learning models, and a **local clinical chatbot** powered by MedGemma and LibreChat.

---

## 🗺️ Project Architecture & Components

The repository is structured as a multi-workspace codebase:

```mermaid
graph TD
    A[Next.js Frontend - Port 3000] -->|Proxy Requests| B[Express Main Backend - Port 5000]
    C[React Native App] -->|Sync Metrics & Auth| B
    B -->|Proxy Models API| D[FastAPI AI Models - Port 8000]
    B -->|Proxy Chatbot API| E[MedGemma Chat Server - Port 8001]
    B -->|Proxy LibreChat| F[LibreChat Server - Port 3080]
    B -->|Database Query| G[(PostgreSQL - Drizzle ORM)]
    B -->|Storage| H[Cloudflare R2 Bucket]
    B -->|AI clinical explanations| I[OpenCode Zen / DeepSeek API]
```

### 1. [frontend](file:///d:/debug_thugs/frontend) (Next.js Web Client)

A modern, beautifully designed web client utilizing Next.js, React, Tailwind CSS, and next-auth. Features a sleek, responsive, and tactile beige/warm aesthetic containing:

- **Interactive Dashboards** for both Patients and Doctors.
- **Onboarding workflows** with profile setups, medical metrics, and clinician assignments.
- **3D Anatomical Body Visualizer** to explore anatomical systems layer by layer.
- **Interactive AI Diagnostic Suite** (visual and tabular file uploads).
- **Hippo Chat Interface** to consult with local medical LLMs.
- **Smartwatch & Health Connect Sync Dashboard** displaying biometric summaries.
- **Medical History Vault** listing past scans and clinical reports with downloadable AI-generated summaries.

### 2. [app](file:///d:/debug_thugs/app) (React Native Mobile Application)

A React Native app designed to integrate seamlessly with Android’s **Google Health Connect** framework.

- **Biometric Syncing**: Reads/writes 14+ categories of health data, including Steps, Distance, Active Calories, Sleep Sessions, Heart Rate, Weight, Height, Blood Glucose, Blood Pressure, and hydration.
- **Sync Engine**: Periodically packages and pushes aggregated daily metrics to the Express backend database.
- **Authentication**: Connects to the centralized backend auth session for secure patient data ingestion.

### 3. [backend](file:///d:/debug_thugs/backend) (Express API Server)

A Node.js & Express server running on port `5000` serving as the centralized orchestrator:

- **Database Layer**: PostgreSQL database powered by **Drizzle ORM** for handling users, doctor profiles, patient assignments, scans, metrics, and reports.
- **Authentication & Onboarding**: Proxy header extraction and token validation (JWT) for secure registration and profile customization.
- **File Upload Service**: Direct multipart streaming and upload to **Cloudflare R2** buckets for profile images, disease scans, and PDF medical reports.
- **Clinical AI Summary Integrations**: Connects to **OpenCode Zen (DeepSeek)** to generate medical descriptions, actionable suggestions, medicine lists, and anatomical impact zones for every scan and uploaded report.
- **Service Proxies**: Exposes unified gateways to the FastAPI models and MedGemma servers.

### 4. [ai_models](file:///d:/debug_thugs/ai_models) (FastAPI AI Models)

A FastAPI Python server running on port `8000` that loads and executes predictions on 6 localized medical diagnostic models:

1. **Bone Fracture Detection**: YOLOv11 object detection on X-rays (`POST /predict/bone`).
2. **Brain Tumor Detection**: YOLOv11 object detection on MRIs (`POST /predict/brain`).
3. **ECG Arrhythmia Classification**: 1D-CNN classifying 187-point heartbeat signals (`POST /predict/ecg`).
4. **Heart Disease Risk Prediction**: XGBoost model predicting cardiovascular risk using clinical tabular biometrics (`POST /predict/heart`).
5. **Chest X-Ray Pathology**: DenseNet121 (TorchXRayVision) multi-label chest pathology analyzer (`POST /predict/chest`).
6. **Skin Disease Detection**: YOLOv11 classification of benign/malignant skin conditions (`POST /predict/skin`).

### 5. [chatbot](file:///d:/debug_thugs/chatbot) (Clinical Chatbot Stack)

- **`MedGemma/`**: A FastAPI Python server running on port `8001` that hosts and runs the MedGemma medical LLM for private, local clinical chat.
- **`LibreChat/`**: A customizable instance of LibreChat running on port `3080` configured for rich markdown-based conversational clinical assistant duties.

---

## 🚀 Core Features

### 🩺 Interactive AI Diagnostic Suite

Patients can upload scans (X-ray, MRI, Skin Photo) or input clinical parameters (ECG arrays, tabular biometrics) to run evaluations. The results are paired with:

- **Interactive bounding box projections** for tumor and bone detection.
- **OpenCode Zen / DeepSeek clinical analysis**: Generates explanations, suggested medications, body systems involved, and lifestyle/clinical recommendations automatically.

### 🦴 3D Anatomical Body Visualizer

An interactive tool that allows users to traverse structural layers of the human anatomy.

- **Layers included**: Skeleton Structure, Circulatory System, Urinary System, Digestive System, Gallbladder, Liver, and more.
- Provides interactive breakdowns and contextual explanations for each layer and organ group.

### 📊 Health Connect Smartwatch Sync

Connects to wearable devices via the React Native companion app.

- Tracks metrics like steps, heart rate averages (min/max), sleep duration/phases, and calorie expenditure.
- Displays comprehensive timeline charts on the web frontend.

### 📁 Medical History Vault

A secure portal to manage diagnostics:

- **Scan Repository**: Stores all historical AI model predictions with their interactive outcomes.
- **Medical Reports Upload**: Upload PDF/image reports (Labs, Imaging, Prescriptions, Discharges) with automated AI summaries generated for quick clinical recall.

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** (v18+ recommended)
- **Python 3.10+** (with virtual environment support)
- **PostgreSQL** Database
- **Cloudflare R2 Bucket** (or S3-compatible alternative)
- **OpenCode Zen API Key** (for DeepSeek clinical summary generation)

### Environment Configuration

1. **Backend Environment** ([backend/.env](file:///d:/debug_thugs/backend/.env)):

   ```env
   PORT=5000
   DATABASE_URL=postgresql://user:pass@localhost:5432/hippohealth
   JWT_SECRET=your_jwt_secret
   R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=hippohealth-bucket
   R2_PUBLIC_URL=https://pub-yourdomain.r2.dev
   OPENCODE_ZEN_KEY=your_opencode_zen_api_key
   OPENCODE_ZEN_MODEL=deepseek-v4-flash-free
   MODELS_URL=http://localhost:8000
   NEXT_PUBLIC_CHATBOT_URL=http://localhost:8001
   ```

2. **Frontend Environment** ([frontend/.env.local](file:///d:/debug_thugs/frontend/.env.local)):

   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Mobile App Base Configuration** (Update [app/App.tsx](file:///d:/debug_thugs/app/App.tsx) and [app/LoginScreen.tsx](file:///d:/debug_thugs/app/LoginScreen.tsx)):
   ```typescript
   const API_BASE = "http://<your-local-ip-or-ngrok-tunnel>";
   ```

---

## 🏃 Running the Application

### 1. Launch all Backends & AI Models

Run the helper batch script [start_all_backends.bat](file:///d:/debug_thugs/start_all_backends.bat) located at the root of the project to spawn the Express Backend, FastAPI Models, MedGemma Server, and LibreChat Server in dedicated terminal windows:

```bash
./start_all_backends.bat
```

Alternatively, run them manually:

- **Main Express Backend**:
  ```bash
  cd backend && npm install && npm run dev
  ```
- **FastAPI AI Models**:
  ```bash
  cd ai_models && python -m venv venv && venv\Scripts\activate
  pip install -r requirements.txt
  python app.py
  ```
- **MedGemma Chat Server**:
  ```bash
  cd chatbot/MedGemma && python run_medgemma.py
  ```
- **LibreChat Server**:
  ```bash
  cd chatbot/LibreChat && npm run backend
  ```

### 2. Run the Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Run the Mobile App (React Native)

```bash
cd app
npm install
# Start Metro bundler
npm start
# Build for Android / iOS
npm run android # or npm run ios
```

---

## 🛡️ Privacy & HIPAA Compliance

HippoHealth is designed around key clinical security considerations:

- **Secure Authentication**: End-to-end token validation with JWT.
- **Onboarding Consent**: Patients must review and accept the **Terms of Clinical Use** and **Privacy Policy** regarding AI-generated recommendations.
- **HIPAA Guardrails**: The application documents and displays HIPAA-compliance guidelines, stressing that the AI models are for assistive diagnostic research and should be verified by a licensed clinician.

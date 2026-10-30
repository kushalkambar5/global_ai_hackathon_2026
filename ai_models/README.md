# AI Digital Twin Medical Models API - Integration Guide

This document is designed specifically for AI assistants and frontend developers to understand exactly how to integrate and use the FastAPI backend for the 6 medical AI models.

## Base URL and Setup

**Local Execution:**

1. Install dependencies: `pip install -r requirements.txt`
2. Run the server: `uvicorn app:app --port 8000 --reload   or      python -m uvicorn app:app --port 8000 --reload
`
3. The API will be available at: `http://localhost:8000`
4. Interactive Swagger documentation: `http://localhost:8000/docs`

---

## 1. Bone Fracture Detection

- **Endpoint:** `POST /predict/bone`
- **Description:** Analyzes an X-ray image to detect bone fractures using YOLOv11.
- **Request Format:** `multipart/form-data`
- **Parameters:**
  - `file`: The image file (UploadFile).
- **Response Format (JSON):**
  ```json
  {
    "diagnosis": "fractured", // or "non-fractured"
    "confidence": 98.5 // Percentage (0-100)
  }
  ```

## 2. Brain Tumor Detection

- **Endpoint:** `POST /predict/brain`
- **Description:** Detects brain tumors in MRI scans using YOLOv11 object detection.
- **Request Format:** `multipart/form-data`
- **Parameters:**
  - `file`: The MRI image file (UploadFile).
- **Response Format (JSON):**
  ```json
  {
    "detections": [
      {
        "class": "tumor",
        "confidence": 92.4, // Percentage
        "bbox": [120.5, 80.0, 240.2, 190.4] // [x_min, y_min, x_max, y_max]
      }
    ],
    "tumor_found": true // Boolean
  }
  ```

## 3. ECG Arrhythmia Classification

- **Endpoint:** `POST /predict/ecg`
- **Description:** Classifies heartbeat signals using a 1D-CNN.
- **Request Format:** `application/json`
- **Request Schema:**
  ```json
  {
    "signal": [0.12, 0.45, 0.67, ...] // Array of exactly 187 float values
  }
  ```
- **Response Format (JSON):**
  ```json
  {
    "diagnosis": "Normal Sinus Rhythm",
    "class_id": 0, // Integer (0-4)
    "confidence": 99.1 // Percentage (0-100)
  }
  ```
- **Classes:**
  0: Normal Sinus Rhythm, 1: Supraventricular Premature Beat, 2: PVC, 3: Fusion, 4: Unclassifiable

## 4. Heart Disease Risk Prediction

- **Endpoint:** `POST /predict/heart`
- **Description:** Predicts the risk of heart disease based on tabular clinical patient data using XGBoost.
- **Request Format:** `application/json`
- **Request Schema:**
  ```json
  {
    "age": 55.0,
    "sex": 1.0, // 1=Male, 0=Female
    "cp": 3.0, // Chest pain type (0-3)
    "trestbps": 140.0, // Resting blood pressure
    "chol": 240.0, // Serum cholestoral in mg/dl
    "fbs": 0.0, // Fasting blood sugar > 120 mg/dl (1=true; 0=false)
    "restecg": 1.0, // Resting ECG results (0-2)
    "thalach": 150.0, // Maximum heart rate achieved
    "exang": 0.0, // Exercise induced angina (1=yes; 0=no)
    "oldpeak": 2.5, // ST depression induced by exercise relative to rest
    "slope": 1.0, // Slope of the peak exercise ST segment (0-2)
    "ca": 0.0, // Number of major vessels (0-3) colored by flourosopy
    "thal": 2.0 // 1=normal; 2=fixed defect; 3=reversable defect
  }
  ```
- **Response Format (JSON):**
  ```json
  {
    "risk_prediction": 1, // 1 for High Risk, 0 for Low Risk
    "disease_probability": 85.4, // Percentage (0-100)
    "diagnosis": "High Risk"
  }
  ```

## 5. Chest X-Ray Pathology

- **Endpoint:** `POST /predict/chest`
- **Description:** Analyzes chest X-rays across multiple pathologies using TorchXRayVision (DenseNet121).
- **Request Format:** `multipart/form-data`
- **Parameters:**
  - `file`: The chest X-ray image file (UploadFile).
- **Response Format (JSON):**
  ```json
  {
    "pathology_probabilities": {
      "Atelectasis": 12.45,
      "Consolidation": 5.21,
      "Infiltration": 65.3,
      "Pneumothorax": 1.1,
      "Edema": 3.45,
      "Emphysema": 0.9,
      "Fibrosis": 1.2,
      "Effusion": 45.6,
      "Pneumonia": 8.9,
      "Pleural_Thickening": 2.1,
      "Cardiomegaly": 15.6,
      "Nodule": 4.5,
      "Mass": 2.3,
      "Hernia": 0.1,
      "Lung Lesion": 1.5,
      "Fracture": 0.8,
      "Lung Opacity": 50.2,
      "Enlarged Cardiomediastinum": 12.3
    }
  }
  ```
  _(Note: All values are percentages 0-100)._

## 6. Skin Disease Detection

- **Endpoint:** `POST /predict/skin`
- **Description:** Classifies skin diseases using YOLOv11 classification.
- **Request Format:** `multipart/form-data`
- **Parameters:**
  - `file`: The skin image file (UploadFile).
- **Response Format (JSON):**
  ```json
  {
    "diagnosis": "Eczema",
    "confidence": 94.2 // Percentage (0-100)
  }
  ```
- **Available Classes:** `Benign_tumors`, `Eczema`, `Psoriasis`, `Seborrh_Keratoses`, `SkinCancer`.

---

## AI Agent Integration Tips:

- When making `multipart/form-data` requests (image uploads), ensure you construct the FormData properly in Javascript using `new FormData()` and append the file using `formData.append('file', fileObject)`. Do NOT manually set the `Content-Type` header to `multipart/form-data` when using `fetch` or `axios`, as the browser needs to automatically set the boundary.
- For JSON endpoints (`/predict/ecg` and `/predict/heart`), send standard JSON requests with `Content-Type: application/json`.
- Handle CORS if frontend and backend run on different ports (e.g. Frontend on 3000, API on 8000). The FastAPI server is configured to `allow_origins=["*"]` by default.

import os
import io
import torch
import torch.nn as nn
import xgboost as xgb
import numpy as np
import skimage.io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import torchxrayvision as xrv
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AI Digital Twin Medical Models API", version="1.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# MODEL DEFINITIONS & LOADING
# ==========================================
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# 1. ECG 1D-CNN Architecture
class ECG_1D_CNN(nn.Module):
    def __init__(self):
        super(ECG_1D_CNN, self).__init__()
        self.conv1 = nn.Conv1d(in_channels=1, out_channels=32, kernel_size=5)
        self.pool1 = nn.MaxPool1d(kernel_size=2)
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=5)
        self.pool2 = nn.MaxPool1d(kernel_size=2)
        self.relu = nn.ReLU()
        self.flatten = nn.Flatten()
        self.fc1 = nn.Linear(64 * 43, 128) 
        self.fc2 = nn.Linear(128, 5)

    def forward(self, x):
        x = self.relu(self.conv1(x))
        x = self.pool1(x)
        x = self.relu(self.conv2(x))
        x = self.pool2(x)
        x = self.flatten(x)
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

ECG_CLASSES = {
    0: "Normal Sinus Rhythm",
    1: "Supraventricular Premature Beat",
    2: "Premature Ventricular Contraction (PVC)",
    3: "Fusion of Ventricular and Normal Beat",
    4: "Unclassifiable Beat"
}

# Global models
bone_model = None
brain_model = None
ecg_model = None
heart_model = None
chest_model = None
skin_model = None
# Medication-adherence models (ported from abcd/ reference)
adherence_encoder = None
adherence_classifier = None

# --- Adherence model constants (must match abcd/train.py) ---
ADHERENCE_INPUT_DIM = 3 * 288  # 864
ADHERENCE_HIDDEN_DIMS = [512, 256, 128]
ADHERENCE_EMBEDDING_DIM = 64
ADHERENCE_DROPOUT_RATE = 0.3


class AdherenceEncoder(nn.Module):
    """Ported from abcd/train.py Encoder (864 -> 64)."""
    def __init__(self, input_dim=ADHERENCE_INPUT_DIM, hidden_dims=None, embedding_dim=ADHERENCE_EMBEDDING_DIM, dropout_rate=ADHERENCE_DROPOUT_RATE):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = ADHERENCE_HIDDEN_DIMS
        dims = [input_dim] + list(hidden_dims) + [embedding_dim]
        layers = []
        for i in range(len(dims) - 1):
            layers.append(nn.Linear(dims[i], dims[i + 1]))
            if i < len(dims) - 2:
                layers.append(nn.ReLU())
                layers.append(nn.Dropout(dropout_rate))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


class AdherenceClassifier(nn.Module):
    """Ported from abcd/train.py LogisticRegressionHead (64 -> 1)."""
    def __init__(self, embedding_dim=ADHERENCE_EMBEDDING_DIM):
        super().__init__()
        self.classifier = nn.Linear(embedding_dim, 1)

    def forward(self, d):
        return self.classifier(d).squeeze(-1)


def _adherence_impute_nan(x: np.ndarray) -> np.ndarray:
    x = x.copy()
    for c in range(x.shape[0]):
        row = x[c]
        nan_mask = np.isnan(row)
        if nan_mask.any():
            valid_idx = np.where(~nan_mask)[0]
            if len(valid_idx) == 0:
                row[:] = 0.0
            else:
                row[nan_mask] = np.interp(np.where(nan_mask)[0], valid_idx, row[valid_idx])
        x[c] = row
    return x


def _adherence_preprocess(x: np.ndarray) -> np.ndarray:
    x = _adherence_impute_nan(x)
    means = x.mean(axis=1, keepdims=True)
    x = x - means
    return x.astype(np.float32).flatten()

@app.on_event("startup")
def load_models():
    global bone_model, brain_model, ecg_model, heart_model, chest_model, skin_model, adherence_encoder, adherence_classifier
    
    # 1. Bone Fracture Model
    bone_path = os.path.join(MODELS_DIR, "best_fracture_classifier.pt")
    if os.path.exists(bone_path):
        bone_model = YOLO(bone_path)
        
    # 2. Brain Tumor Model
    brain_path = os.path.join(MODELS_DIR, "best_brain_tumor_model.pt")
    if os.path.exists(brain_path):
        brain_model = YOLO(brain_path)
        
    # 3. ECG Model
    ecg_path = os.path.join(MODELS_DIR, "best_ecg_model.pth")
    if os.path.exists(ecg_path):
        ecg_model = ECG_1D_CNN()
        ecg_model.load_state_dict(torch.load(ecg_path, map_location=torch.device('cpu')))
        ecg_model.eval()
        
    # 4. Heart XGBoost Model
    heart_path = os.path.join(MODELS_DIR, "heart_xgb_model.json")
    if os.path.exists(heart_path):
        heart_model = xgb.XGBClassifier()
        heart_model.load_model(heart_path)
        
    # 5. Chest X-Ray Model
    # Automatically downloads weights if not present locally
    chest_model = xrv.models.DenseNet(weights="densenet121-res224-all")
    chest_model.eval()
    
    # 6. Skin Disease Model
    skin_path = os.path.join(MODELS_DIR, "best.pt")
    if os.path.exists(skin_path):
        skin_model = YOLO(skin_path)

    # 7. Medication-adherence Encoder (864 -> 64), ported from abcd/models/encoder.pt
    adherence_encoder_path = os.path.join(MODELS_DIR, "encoder.pt")
    if os.path.exists(adherence_encoder_path):
        try:
            adherence_encoder = AdherenceEncoder()
            adherence_encoder.load_state_dict(torch.load(adherence_encoder_path, map_location=torch.device('cpu')))
            adherence_encoder.eval()
        except Exception as e:
            print(f"[adherence] failed to load encoder: {e}")
            adherence_encoder = None

    # 8. Medication-adherence Logistic head (64 -> 1), ported from abcd/models/classifier.pt
    adherence_classifier_path = os.path.join(MODELS_DIR, "classifier.pt")
    if os.path.exists(adherence_classifier_path):
        try:
            adherence_classifier = AdherenceClassifier()
            adherence_classifier.load_state_dict(torch.load(adherence_classifier_path, map_location=torch.device('cpu')))
            adherence_classifier.eval()
        except Exception as e:
            print(f"[adherence] failed to load classifier: {e}")
            adherence_classifier = None

@app.get("/")
def home():
    return {"message": "AI Digital Twin Medical Models API is running!"}

# ==========================================
# ENDPOINTS
# ==========================================

from PIL import Image
import torchvision

def load_image(file_bytes):
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")

@app.post("/predict/bone")
async def predict_bone(file: UploadFile = File(...)):
    if bone_model is None:
        raise HTTPException(status_code=500, detail="Bone model not loaded")
    
    image_bytes = await file.read()
    image = load_image(image_bytes)
    
    results = bone_model.predict(source=image, save=False)
    probs = results[0].probs
    class_names = bone_model.names
    
    top_class_id = probs.top1
    top_class_name = class_names[top_class_id]
    top_confidence = float(probs.top1conf) * 100
    
    return {
        "diagnosis": top_class_name,
        "confidence": round(top_confidence, 2)
    }

@app.post("/predict/brain")
async def predict_brain(file: UploadFile = File(...)):
    if brain_model is None:
        raise HTTPException(status_code=500, detail="Brain model not loaded")
        
    image_bytes = await file.read()
    image = load_image(image_bytes)
    
    results = brain_model.predict(source=image, conf=0.25, save=False)
    
    detections = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            conf = float(box.conf[0]) * 100
            class_id = int(box.cls[0])
            class_name = brain_model.names[class_id]
            detections.append({
                "class": class_name,
                "confidence": round(conf, 2),
                "bbox": box.xyxy[0].tolist()
            })
            
    return {
        "detections": detections,
        "tumor_found": len(detections) > 0
    }

class ECGRequest(BaseModel):
    signal: List[float]

@app.post("/predict/ecg")
def predict_ecg(request: ECGRequest):
    if ecg_model is None:
        raise HTTPException(status_code=500, detail="ECG model not loaded")
    
    if len(request.signal) != 187:
        raise HTTPException(status_code=400, detail="Signal must contain exactly 187 float values")
        
    signal_tensor = torch.tensor(request.signal, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
    
    with torch.no_grad():
        output = ecg_model(signal_tensor)
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        pred_label_id = torch.argmax(probabilities).item()
        confidence = probabilities[pred_label_id].item() * 100
        
    return {
        "diagnosis": ECG_CLASSES[pred_label_id],
        "class_id": pred_label_id,
        "confidence": round(confidence, 2)
    }

class HeartRequest(BaseModel):
    age: float
    sex: float
    cp: float
    trestbps: float
    chol: float
    fbs: float
    restecg: float
    thalach: float
    exang: float
    oldpeak: float
    slope: float
    ca: float
    thal: float

@app.post("/predict/heart")
def predict_heart(request: HeartRequest):
    if heart_model is None:
        raise HTTPException(status_code=500, detail="Heart model not loaded")
        
    patient_data = np.array([[
        request.age, request.sex, request.cp, request.trestbps, request.chol,
        request.fbs, request.restecg, request.thalach, request.exang,
        request.oldpeak, request.slope, request.ca, request.thal
    ]])
    
    pred_class = heart_model.predict(patient_data)[0]
    probabilities = heart_model.predict_proba(patient_data)[0]
    prob_disease = probabilities[1] * 100
    
    return {
        "risk_prediction": int(pred_class),
        "disease_probability": round(float(prob_disease), 2),
        "diagnosis": "High Risk" if pred_class == 1 else "Low Risk"
    }

@app.post("/predict/chest")
async def predict_chest(file: UploadFile = File(...)):
    if chest_model is None:
        raise HTTPException(status_code=500, detail="Chest model not loaded")
        
    image_bytes = await file.read()
    
    # TorchXRayVision requires [-1024, 1024] 1-channel image
    img = skimage.io.imread(io.BytesIO(image_bytes))
    img = xrv.datasets.normalize(img, 255)
    
    if len(img.shape) == 3:
        img = img.mean(2) # Convert to single color channel
    
    img = img[None, ...] # Add channel dimension
    
    transform = torchvision.transforms.Compose([
        xrv.datasets.XRayCenterCrop(),
        xrv.datasets.XRayResizer(224)
    ])
    
    img = transform(img)
    img_tensor = torch.from_numpy(img).unsqueeze(0) # Add batch dimension
    
    with torch.no_grad():
        outputs = chest_model(img_tensor)
        
    results = dict(zip(chest_model.pathologies, outputs[0].detach().numpy()))
    
    # Convert numpy floats to native python floats for JSON serialization
    results_serializable = {k: round(float(v) * 100, 2) for k, v in results.items()}
    
    return {
        "pathology_probabilities": results_serializable
    }

@app.post("/predict/skin")
async def predict_skin(file: UploadFile = File(...)):
    if skin_model is None:
        raise HTTPException(status_code=500, detail="Skin model not loaded")
        
    image_bytes = await file.read()
    image = load_image(image_bytes)
    
    results = skin_model.predict(source=image, save=False)
    probs = results[0].probs
    class_names = skin_model.names
    
    top_class_id = probs.top1
    top_class_name = class_names[top_class_id]
    top_confidence = float(probs.top1conf) * 100
    
    return {
        "diagnosis": top_class_name,
        "confidence": round(top_confidence, 2)
    }

# ==========================================
# MEDICATION ADHERENCE (ported from abcd/main.py)
# Encoder: 288*3 vitals -> 64-dim pattern (today/general)
# Classifier: |zA - zB| -> similarity score (logistic model)
# ==========================================

from typing import Union


class RawVitalsRequest(BaseModel):
    vitals_data: Union[List[List[float]], List[float]]


class CompareFeaturesRequest(BaseModel):
    feature_a: List[float]
    feature_b: List[float]


@app.post("/extract-features")
def extract_features(request: RawVitalsRequest):
    if adherence_encoder is None:
        raise HTTPException(status_code=500, detail="Adherence encoder model not loaded")

    raw_data = np.array(request.vitals_data, dtype=np.float32)

    if raw_data.ndim == 1:
        if raw_data.size != ADHERENCE_INPUT_DIM:
            raise HTTPException(status_code=400, detail=f"Flat list length must be {ADHERENCE_INPUT_DIM} (3x288). Got {raw_data.size}.")
        raw_data = raw_data.reshape(3, 288)
    elif raw_data.ndim == 2:
        if raw_data.shape != (3, 288):
            raise HTTPException(status_code=400, detail=f"2D vitals matrix must have shape (3, 288). Got {raw_data.shape}.")
    else:
        raise HTTPException(status_code=400, detail=f"Expected 1D (864) or 2D (3x288). Got ndim={raw_data.ndim}.")

    processed_vec = _adherence_preprocess(raw_data)
    tensor_input = torch.from_numpy(processed_vec).unsqueeze(0)

    with torch.no_grad():
        embedding_tensor = adherence_encoder(tensor_input)
        embedding_list = embedding_tensor.squeeze(0).cpu().numpy().tolist()

    return {
        "embedding": [round(float(x), 6) for x in embedding_list],
        "embedding_dim": len(embedding_list),
    }


@app.post("/predict-closeness")
def predict_closeness(request: CompareFeaturesRequest, threshold: float = 0.5):
    if adherence_classifier is None:
        raise HTTPException(status_code=500, detail="Adherence classifier model not loaded")

    if len(request.feature_a) != ADHERENCE_EMBEDDING_DIM or len(request.feature_b) != ADHERENCE_EMBEDDING_DIM:
        raise HTTPException(status_code=400, detail=f"Both feature vectors must have dimension {ADHERENCE_EMBEDDING_DIM}.")

    feat_a = np.array(request.feature_a, dtype=np.float32)
    feat_b = np.array(request.feature_b, dtype=np.float32)
    diff = np.abs(feat_a - feat_b)
    diff_tensor = torch.from_numpy(diff).unsqueeze(0)

    with torch.no_grad():
        logit = adherence_classifier(diff_tensor)
        score = torch.sigmoid(logit).item()

    is_close = score >= threshold
    return {
        "similarity_score": round(float(score), 4),
        "similarity_pct": round(float(score) * 100, 2),
        "is_close": bool(is_close),
        "prediction_label": 1 if is_close else 0,
        "status": "High similarity (Close / Adherent pattern)" if is_close else "Low similarity (Distant / Anomaly pattern)",
        "medication_taken": bool(is_close),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
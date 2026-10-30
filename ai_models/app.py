import os
import io
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
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
from contextlib import asynccontextmanager

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

def load_models():
    global bone_model, brain_model, ecg_model, heart_model, chest_model, skin_model

    # 1. Bone Fracture Model
    try:
        bone_path = os.path.join(MODELS_DIR, "best_fracture_classifier.pt")
        if os.path.exists(bone_path):
            print("Loading bone model...", flush=True)
            bone_model = YOLO(bone_path)
            print("Bone model loaded.", flush=True)
        else:
            print(f"WARNING: bone model not found at {bone_path}", flush=True)
    except Exception as e:
        print(f"ERROR loading bone model: {e}", flush=True)

    # 2. Brain Tumor Model
    try:
        brain_path = os.path.join(MODELS_DIR, "best_brain_tumor_model.pt")
        if os.path.exists(brain_path):
            print("Loading brain model...", flush=True)
            brain_model = YOLO(brain_path)
            print("Brain model loaded.", flush=True)
        else:
            print(f"WARNING: brain model not found at {brain_path}", flush=True)
    except Exception as e:
        print(f"ERROR loading brain model: {e}", flush=True)

    # 3. ECG Model
    try:
        ecg_path = os.path.join(MODELS_DIR, "best_ecg_model.pth")
        if os.path.exists(ecg_path):
            print("Loading ECG model...", flush=True)
            ecg_model = ECG_1D_CNN()
            ecg_model.load_state_dict(torch.load(ecg_path, map_location=torch.device('cpu')))
            ecg_model.eval()
            print("ECG model loaded.", flush=True)
        else:
            print(f"WARNING: ECG model not found at {ecg_path}", flush=True)
    except Exception as e:
        print(f"ERROR loading ECG model: {e}", flush=True)

    # 4. Heart XGBoost Model
    try:
        heart_path = os.path.join(MODELS_DIR, "heart_xgb_model.json")
        if os.path.exists(heart_path):
            print("Loading heart model...", flush=True)
            heart_model = xgb.XGBClassifier()
            heart_model.load_model(heart_path)
            print("Heart model loaded.", flush=True)
        else:
            print(f"WARNING: heart model not found at {heart_path}", flush=True)
    except Exception as e:
        print(f"ERROR loading heart model: {e}", flush=True)

    # 5. Chest X-Ray Model (lazy - loaded on first /predict/chest call
    # to avoid blocking server startup with a large download)
    # See get_chest_model() below.
    print("Chest model will lazy-load on first request.", flush=True)

    # 6. Skin Disease Model
    try:
        skin_path = os.path.join(MODELS_DIR, "best.pt")
        if os.path.exists(skin_path):
            print("Loading skin model...", flush=True)
            skin_model = YOLO(skin_path)
            print("Skin model loaded.", flush=True)
        else:
            print(f"WARNING: skin model not found at {skin_path}", flush=True)
    except Exception as e:
        print(f"ERROR loading skin model: {e}", flush=True)


def get_chest_model():
    """Lazy-load chest model so startup never blocks on download."""
    global chest_model
    if chest_model is None:
        print("Loading chest model (first request)...", flush=True)
        chest_model = xrv.models.DenseNet(weights="densenet121-res224-all")
        chest_model.eval()
        print("Chest model loaded.", flush=True)
    return chest_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting model loading...", flush=True)
    load_models()
    print("Model loading finished. Server ready.", flush=True)
    yield
    print("Shutting down.", flush=True)


app = FastAPI(title="AI Digital Twin Medical Models API", version="1.0", lifespan=lifespan)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "AI Digital Twin Medical Models API is running!"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "bone": bone_model is not None,
            "brain": brain_model is not None,
            "ecg": ecg_model is not None,
            "heart": heart_model is not None,
            "chest": chest_model is not None,
            "skin": skin_model is not None,
        },
    }

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
    try:
        model = get_chest_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chest model failed to load: {e}")
        
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
        outputs = model(img_tensor)
        
    results = dict(zip(model.pathologies, outputs[0].detach().numpy()))
    
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

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)


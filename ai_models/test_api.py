import requests
import os
import random
import pandas as pd
import json

BASE_URL = "http://localhost:7860"
TRAINING_DIR = r"F:\Coding\project\Medical\trianing"

def print_result(model_name, expected, actual, confidence=None):
    print(f"\n[{model_name.upper()}]")
    print(f"  Expected : {expected}")
    print(f"  Actual   : {actual}")
    if confidence is not None:
        print(f"  Confidence: {confidence}%")
    
    expected_str = str(expected).lower()
    actual_str = str(actual).lower()
    
    if expected_str in actual_str or actual_str in expected_str:
        print("  MATCH")
    else:
        print("  POSSIBLE MISMATCH (or valid prediction that differs from folder name)")

def test_bone():
    try:
        fractured_dir = os.path.join(TRAINING_DIR, r"Bone\archive\FracAtlas\images\Fractured")
        img_name = os.listdir(fractured_dir)[0]
        img_path = os.path.join(fractured_dir, img_name)
        
        with open(img_path, 'rb') as f:
            resp = requests.post(f"{BASE_URL}/predict/bone", files={"file": f})
        
        data = resp.json()
        print_result("Bone Fracture", "fractured", data.get("diagnosis"), data.get("confidence"))
    except Exception as e:
        print(f"Bone Test Failed: {e}")

def test_brain():
    try:
        # Assuming YOLOv11 images
        img_dir = os.path.join(TRAINING_DIR, r"Brain\archive\BrainTumor\BrainTumorYolov11\train\images")
        img_name = os.listdir(img_dir)[0]
        img_path = os.path.join(img_dir, img_name)
        
        with open(img_path, 'rb') as f:
            resp = requests.post(f"{BASE_URL}/predict/brain", files={"file": f})
            
        data = resp.json()
        status = "tumor_found=True" if data.get("tumor_found") else "tumor_found=False"
        print_result("Brain Tumor", "tumor_found=True", status)
        if data.get("detections"):
            print(f"  Detections: {data['detections'][0]['class']} ({data['detections'][0]['confidence']}%)")
    except Exception as e:
        print(f"Brain Test Failed: {e}")

def test_ecg():
    try:
        csv_path = os.path.join(TRAINING_DIR, r"ECG\archive (1)\mitbih_test.csv")
        df = pd.read_csv(csv_path, header=None)
        # Pick a random row
        row = df.iloc[random.randint(0, len(df)-1)].values
        signal = row[:-1].tolist()
        true_label_id = int(row[-1])
        
        ECG_CLASSES = {
            0: "Normal Sinus Rhythm",
            1: "Supraventricular Premature Beat",
            2: "Premature Ventricular Contraction (PVC)",
            3: "Fusion of Ventricular and Normal Beat",
            4: "Unclassifiable Beat"
        }
        
        resp = requests.post(f"{BASE_URL}/predict/ecg", json={"signal": signal})
        data = resp.json()
        print_result("ECG", ECG_CLASSES.get(true_label_id), data.get("diagnosis"), data.get("confidence"))
    except Exception as e:
        print(f"ECG Test Failed: {e}")

def test_heart():
    try:
        patient_a = {
            "age": 35, "sex": 1, "cp": 0, "trestbps": 120.0, "chol": 180.0,
            "fbs": 0, "restecg": 1, "thalach": 170.0, "exang": 0,
            "oldpeak": 0.0, "slope": 2, "ca": 0, "thal": 1
        }
        resp = requests.post(f"{BASE_URL}/predict/heart", json=patient_a)
        data = resp.json()
        print_result("Heart Disease (Patient A)", "Low Risk", data.get("diagnosis"), data.get("disease_probability"))
        
        patient_b = {
            "age": 65, "sex": 1, "cp": 3, "trestbps": 160.0, "chol": 280.0,
            "fbs": 1, "restecg": 2, "thalach": 110.0, "exang": 1,
            "oldpeak": 2.5, "slope": 1, "ca": 2, "thal": 3
        }
        resp2 = requests.post(f"{BASE_URL}/predict/heart", json=patient_b)
        data2 = resp2.json()
        print_result("Heart Disease (Patient B)", "High Risk", data2.get("diagnosis"), data2.get("disease_probability"))
    except Exception as e:
        print(f"Heart Test Failed: {e}")

def test_chest():
    try:
        img_path = os.path.join(TRAINING_DIR, r"Bone\archive\FracAtlas\images\Fractured\IMG0000019.jpg")
        with open(img_path, 'rb') as f:
            resp = requests.post(f"{BASE_URL}/predict/chest", files={"file": f})
        
        data = resp.json()
        probs = data.get("pathology_probabilities", {})
        highest_prob = max(probs.items(), key=lambda k: k[1]) if probs else ("None", 0)
        
        print_result("Chest X-Ray", "Various Pathologies", f"Highest: {highest_prob[0]}", highest_prob[1])
    except Exception as e:
        print(f"Chest Test Failed: {e}")

def test_skin():
    try:
        eczema_dir = os.path.join(TRAINING_DIR, r"Skin\Skin disease.v1i.folder\train\Eczema")
        img_name = os.listdir(eczema_dir)[0]
        img_path = os.path.join(eczema_dir, img_name)
        
        with open(img_path, 'rb') as f:
            resp = requests.post(f"{BASE_URL}/predict/skin", files={"file": f})
            
        data = resp.json()
        print_result("Skin Disease", "Eczema", data.get("diagnosis"), data.get("confidence"))
    except Exception as e:
        print(f"Skin Test Failed: {e}")

if __name__ == "__main__":
    print("========================================")
    print("STARTING API TESTS ACROSS ALL 6 MODELS")
    print("========================================")
    
    test_bone()
    test_brain()
    test_ecg()
    test_heart()
    test_chest()
    test_skin()
    
    print("\n========================================")
    print("TESTING COMPLETE")
    print("========================================")

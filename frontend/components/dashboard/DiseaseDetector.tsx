"use client";

import React, { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

// Base URL for model predictions
const MODELS_URL = "/api/models";

// Interface Definitions
interface PredictionResult {
  diagnosis?: string;
  confidence?: number;
  tumor_found?: boolean;
  detections?: Array<{
    class: string;
    confidence: number;
    bbox: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
  }>;
  risk_prediction?: number;
  disease_probability?: number;
  pathology_probabilities?: Record<string, number>;
  ai_explanation?: string;
  ai_suggestions?: string[];
  medicines?: string[];
  affected_parts?: number[];
}

const STAGE_NAME_MAP: Record<number, string> = {
  1: "Skeleton Structure",
  2: "Circulatory System",
  3: "Urinary System",
  4: "Digestive System",
  5: "Gallbladder",
  6: "Liver",
  7: "Diaphragm",
  8: "Heart",
  9: "Lungs",
  10: "Brain",
  11: "Eyes",
  12: "Muscular System",
  13: "Full Body (Skin)",
};

// Generate a synthetic ECG signal (187 points)
const generateSyntheticECG = (type: "normal" | "pvc" | "supraventricular"): number[] => {
  const signal = new Array(187).fill(0);
  
  for (let i = 0; i < 187; i++) {
    // Base heart line (sine wave baseline shift)
    let val = 0.05 * Math.sin((i / 187) * Math.PI * 4);
    
    // P wave
    if (i >= 20 && i <= 35) {
      const pProgress = (i - 20) / 15;
      val += 0.12 * Math.sin(pProgress * Math.PI);
    }
    
    // QRS Complex
    if (type === "normal" || type === "supraventricular") {
      if (i >= 42 && i <= 44) {
        val -= 0.15; // Q wave
      } else if (i >= 45 && i <= 49) {
        // R wave
        const rProgress = (i - 45) / 4;
        val += 0.95 * Math.sin(rProgress * Math.PI);
      } else if (i >= 50 && i <= 52) {
        val -= 0.22; // S wave
      }
    } else if (type === "pvc") {
      // PVC has wide, bizarre, elevated QRS complex
      if (i >= 40 && i <= 60) {
        const qrsProgress = (i - 40) / 20;
        val += 0.75 * Math.sin(qrsProgress * Math.PI) * (1 - qrsProgress * 0.5);
      }
    }
    
    // T wave
    const tStart = type === "normal" ? 75 : type === "pvc" ? 100 : 65;
    const tDur = type === "normal" ? 25 : type === "pvc" ? 40 : 20;
    if (i >= tStart && i <= tStart + tDur) {
      const tProgress = (i - tStart) / tDur;
      val += (type === "pvc" ? -0.25 : 0.25) * Math.sin(tProgress * Math.PI); // PVC often has inverted T wave
    }
    
    // Add minor high-frequency noise
    val += (Math.random() - 0.5) * 0.02;
    
    // Constrain to [-1, 1]
    signal[i] = parseFloat(Math.max(-1, Math.min(1, val)).toFixed(4));
  }
  
  return signal;
};

// ECG presets
const ECG_PRESETS = [
  {
    name: "Normal Sinus Rhythm Beat",
    type: "normal",
    emoji: "💚",
    description: "Regular rate, normal P wave, narrow QRS complex.",
    signal: generateSyntheticECG("normal"),
  },
  {
    name: "Premature Ventricular Contraction (PVC)",
    type: "pvc",
    emoji: "⚠️",
    description: "Wide, abnormal QRS shape with inverted T wave.",
    signal: generateSyntheticECG("pvc"),
  },
  {
    name: "Supraventricular Premature Beat",
    type: "supraventricular",
    emoji: "⚡",
    description: "Premature heartbeat originating above the ventricles.",
    signal: generateSyntheticECG("supraventricular"),
  },
];

// Heart Risk presets
const HEART_PRESETS = [
  {
    name: "Patient Alpha (Low Risk Case)",
    age: 35, sex: 1, cp: 0, trestbps: 120, chol: 180, fbs: 0, restecg: 1, thalach: 170, exang: 0, oldpeak: 0.0, slope: 2, ca: 0, thal: 1
  },
  {
    name: "Patient Beta (High Risk Case)",
    age: 65, sex: 1, cp: 3, trestbps: 160, chol: 280, fbs: 1, restecg: 2, thalach: 110, exang: 1, oldpeak: 2.5, slope: 1, ca: 2, thal: 3
  }
];

export default function DiseaseDetector() {
  const [activeModel, setActiveModel] = useState<
    "bone" | "brain" | "ecg" | "heart" | "chest" | "skin"
  >(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const model = params.get("model");
      if (model && ["bone", "brain", "ecg", "heart", "chest", "skin"].includes(model)) {
        return model as "bone" | "brain" | "ecg" | "heart" | "chest" | "skin";
      }
    }
    return "bone";
  });

  // Model states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Bounding box scale states (Brain Tumor)
  const [imageSize, setImageSize] = useState({ displayW: 0, displayH: 0, naturalW: 0, naturalH: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // ECG parameters
  const [ecgSignal, setEcgSignal] = useState<number[]>(ECG_PRESETS[0].signal);
  const [ecgManualInput, setEcgManualInput] = useState<string>(
    ECG_PRESETS[0].signal.join(", ")
  );

  // Heart parameters
  const [heartForm, setHeartForm] = useState({
    age: 50,
    sex: 1, // Male
    cp: 1,  // Typical angina
    trestbps: 130,
    chol: 220,
    fbs: 0,
    restecg: 1,
    thalach: 140,
    exang: 0,
    oldpeak: 1.0,
    slope: 1,
    ca: 0,
    thal: 2,
  });

  // Clear state when model type changes
  useEffect(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setLoading(false);
  }, [activeModel]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleDeselectImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({
      displayW: img.clientWidth,
      displayH: img.clientHeight,
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
    });
  };

  // Resize listener to re-scale bounding boxes dynamically
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        setImageSize((prev) => ({
          ...prev,
          displayW: imgRef.current?.clientWidth || 0,
          displayH: imgRef.current?.clientHeight || 0,
        }));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [previewUrl]);

  const loadEcgPreset = (signal: number[], index: number) => {
    setEcgSignal(signal);
    setEcgManualInput(signal.join(", "));
    setResult(null);
    setError(null);
  };

  const loadHeartPreset = (preset: typeof HEART_PRESETS[0]) => {
    setHeartForm({
      age: preset.age,
      sex: preset.sex,
      cp: preset.cp,
      trestbps: preset.trestbps,
      chol: preset.chol,
      fbs: preset.fbs,
      restecg: preset.restecg,
      thalach: preset.thalach,
      exang: preset.exang,
      oldpeak: preset.oldpeak,
      slope: preset.slope,
      ca: preset.ca,
      thal: preset.thal,
    });
    setResult(null);
    setError(null);
  };

  const handleEcgInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEcgManualInput(e.target.value);
    const parsed = e.target.value
      .split(",")
      .map((x) => parseFloat(x.trim()))
      .filter((x) => !isNaN(x));
    
    if (parsed.length === 187) {
      setEcgSignal(parsed);
      setError(null);
    }
  };

  const handleDiagnose = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let resp;
      if (activeModel === "bone" || activeModel === "brain" || activeModel === "chest" || activeModel === "skin") {
        if (!selectedFile) {
          throw new Error("Please select an image file first.");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);

        resp = await fetch(`${MODELS_URL}/predict/${activeModel}`, {
          method: "POST",
          body: formData, // Browser automatically sets multipart boundary
        });
      } else if (activeModel === "ecg") {
        if (ecgSignal.length !== 187) {
          throw new Error(`Signal must contain exactly 187 values. Currently: ${ecgSignal.length}`);
        }
        resp = await fetch(`${MODELS_URL}/predict/ecg`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ signal: ecgSignal }),
        });
      } else {
        // Heart Model
        resp = await fetch(`${MODELS_URL}/predict/heart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(heartForm),
        });
      }

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Server returned an error status ${resp.status}`);
      }

      const data = await resp.json();

      // Map client-side model names to the ScanType enum
      const scanTypeMap: Record<string, string> = {
        bone: "BONE_FRACTURE",
        brain: "BRAIN_TUMOR",
        ecg: "ECG",
        heart: "HEART",
        skin: "SKIN",
        chest: "CHEST"
      };
      
      const scanType = scanTypeMap[activeModel];
      
      // Construct input metadata
      let modelInputMetadata: any = null;
      if (activeModel === "ecg") {
        modelInputMetadata = { signal: ecgSignal };
      } else if (activeModel === "heart") {
        modelInputMetadata = heartForm;
      }

      // Post scan and prediction details to our backend /api/scans to persist and generate suggestions
      const saveFormData = new FormData();
      saveFormData.append("scanType", scanType);
      saveFormData.append("predictionResult", JSON.stringify(data));
      if (modelInputMetadata) {
        saveFormData.append("modelInputMetadata", JSON.stringify(modelInputMetadata));
      }
      if (selectedFile) {
        saveFormData.append("file", selectedFile);
      }

      const saveResp = await fetch("/api/scans", {
        method: "POST",
        body: saveFormData,
      });

      if (!saveResp.ok) {
        const saveErrText = await saveResp.text();
        console.warn("Failed to save disease scan record to database:", saveErrText);
        setResult(data);
      } else {
        const savedScan = await saveResp.json();
        // Merge database saved details (R2 image URL, OpenCode Zen generated recommendations/explanation/medicines/affected parts)
        setResult({
          ...data,
          ai_explanation: savedScan.aiExplanation,
          ai_suggestions: savedScan.aiSuggestions,
          medicines: savedScan.medicines,
          affected_parts: savedScan.affectedParts
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during prediction.");
    } finally {
      setLoading(false);
    }
  };

  // Sub-navigation models list
  const models = [
    { id: "bone", label: "Bone Fracture", icon: "orthopedics", desc: "Bone Fracture Detection (YOLOv11)" },
    { id: "brain", label: "Brain Tumor", icon: "psychology", desc: "MRI Scan Tumor Box Segmenter (YOLOv11)" },
    { id: "ecg", label: "ECG Classifier", icon: "show_chart", desc: "Arrhythmia Classification (1D-CNN)" },
    { id: "heart", label: "Heart Disease", icon: "favorite", desc: "Heart Risk Evaluator (XGBoost)" },
    { id: "chest", label: "Chest Pathology", icon: "pulmonology", desc: "Chest X-Ray pathologies (DenseNet121)" },
    { id: "skin", label: "Skin Lesions", icon: "vaccines", desc: "Skin Cancer & Rash Classifier (YOLOv11)" },
  ];

  return (
    <div className="w-full bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] overflow-hidden shadow-xs flex flex-col md:flex-row min-h-[680px]">
      
      {/* Sidebar - Choose model */}
      <aside className="w-full md:w-80 p-6 border-b md:border-b-0 md:border-r border-[#E6E1D3] bg-[#FAF9F5] flex flex-col gap-6">
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-[#1C1B18] flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#8C6B1F] rounded-full" />
            AI Diagnostic Suite
          </h3>
          <p className="text-xs text-[#787363] font-sans">
            Choose a clinical model to perform instant cloud-inference predictions.
          </p>
        </div>

        <nav className="space-y-2 flex-1">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModel(m.id as any)}
              className={`w-full p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-3.5 ${
                activeModel === m.id
                  ? "bg-[#1C1B18] text-white border-transparent shadow-xs"
                  : "bg-white border-[#E6E1D3]/50 text-[#4D493E] hover:bg-[#FAF6E8]"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                  activeModel === m.id ? "bg-white/10 text-white" : "bg-[#FAF6E8] text-[#8C6B1F]"
                }`}
              >
                <MaterialIcon name={m.icon} className="text-lg" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wider">
                  {m.label}
                </span>
                <span
                  className={`block text-[10px] truncate ${
                    activeModel === m.id ? "text-white/60" : "text-[#787363]"
                  }`}
                >
                  {m.desc}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Testing Workbench */}
      <section className="flex-1 p-6 md:p-8 flex flex-col justify-between">
        
        {/* Workspace Form */}
        <div className="space-y-6">
          <div className="border-b border-[#E6E1D3] pb-4">
            <span className="text-[9px] font-bold tracking-wider text-[#8C6B1F] bg-[#FAF6E8] border border-[#E6E1D3] px-3 py-1 rounded-full uppercase">
              FastAPI Endpoint: /predict/{activeModel}
            </span>
            <h4 className="font-serif text-2xl font-bold text-[#1C1B18] mt-3">
              {models.find((m) => m.id === activeModel)?.desc}
            </h4>
          </div>

          {/* Model specific input sections */}
          {(activeModel === "bone" || activeModel === "brain" || activeModel === "chest" || activeModel === "skin") && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider">
                Upload Medical Scan (Image File)
              </label>

              <div className={previewUrl ? "flex justify-center w-full" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
                {/* Upload drag drop zone */}
                {!previewUrl && (
                  <div className="relative border-2 border-dashed border-[#DCD5C5] rounded-[24px] p-6 hover:bg-[#FAF6E8]/30 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-12 h-12 rounded-full bg-[#FAF6E8] flex items-center justify-center text-[#8C6B1F] mb-3">
                      <MaterialIcon name="upload_file" className="text-2xl" />
                    </div>
                    <span className="text-sm font-semibold text-[#1C1B18] block">
                      Choose file or drag here
                    </span>
                    <span className="text-xs text-[#787363] mt-1 block">
                      Accepts PNG, JPG, JPEG X-Ray/MRI files
                    </span>
                  </div>
                )}

                {/* Scan preview card */}
                {previewUrl && (
                  <div className="border border-[#E6E1D3] rounded-[24px] overflow-hidden bg-[#FAF6E8]/30 flex items-center justify-center p-4 relative min-h-[260px] w-full max-w-2xl">
                    <div className="relative inline-block max-w-full max-h-[300px]">
                      <img
                        ref={imgRef}
                        src={previewUrl}
                        alt="Scan preview"
                        onLoad={handleImageLoad}
                        className="rounded-xl object-contain max-h-[300px]"
                      />
                      
                      {/* Cancel/Deselect button in the right-top corner of the image */}
                      <button
                        type="button"
                        onClick={handleDeselectImage}
                        className="absolute top-2 right-2 bg-white/95 hover:bg-white text-[#1C1B18] hover:text-[#8C6B1F] rounded-full p-1.5 shadow-md flex items-center justify-center cursor-pointer transition-all z-20 border border-[#E6E1D3]"
                        title="Remove image"
                      >
                        <MaterialIcon name="close" className="text-sm font-bold" />
                      </button>
                      
                      {/* Bounding box rendering logic (Brain tumor model) */}
                      {activeModel === "brain" &&
                        result?.tumor_found &&
                        result?.detections?.map((d, index) => {
                          const scaleX = imageSize.displayW / imageSize.naturalW;
                          const scaleY = imageSize.displayH / imageSize.naturalH;
                          
                          const left = d.bbox[0] * scaleX;
                          const top = d.bbox[1] * scaleY;
                          const width = (d.bbox[2] - d.bbox[0]) * scaleX;
                          const height = (d.bbox[3] - d.bbox[1]) * scaleY;

                          return (
                            <div
                              key={index}
                              className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none group z-10"
                              style={{ left, top, width, height }}
                            >
                              <span className="absolute -top-5 left-0 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                {d.class} ({d.confidence}%)
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModel === "ecg" && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider">
                  ECG Heartbeat Signal Input
                </label>
                <div className="flex gap-2">
                  {ECG_PRESETS.map((preset, index) => (
                    <button
                      key={preset.type}
                      onClick={() => loadEcgPreset(preset.signal, index)}
                      className="px-3 py-1.5 rounded-lg border border-[#E6E1D3] hover:bg-[#FAF6E8] bg-white text-xs font-semibold text-[#8C6B1F] cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.type.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ECG Sparkline Plot */}
              <div className="w-full bg-[#FAF6E8]/40 border border-[#E6E1D3] rounded-[24px] p-5">
                <div className="flex justify-between items-center text-[10px] text-[#787363] uppercase tracking-wider mb-3">
                  <span>Heart Beat Signal Sparkline</span>
                  <span>Length: 187 points</span>
                </div>
                <div className="h-44 w-full bg-white rounded-xl border border-[#E6E1D3]/50 flex items-center justify-center p-3">
                  <svg className="w-full h-full" viewBox="0 0 187 100" preserveAspectRatio="none">
                    {/* Baseline */}
                    <line x1="0" y1="50" x2="187" y2="50" stroke="#FAF6E8" strokeWidth="0.8" strokeDasharray="3" />
                    {/* Signal Plot */}
                    <polyline
                      fill="none"
                      stroke="#8C6B1F"
                      strokeWidth="1.2"
                      points={ecgSignal
                        .map((val, idx) => `${idx},${50 - val * 45}`)
                        .join(" ")}
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-[#4D493E] uppercase tracking-wider">
                  Raw float values (separated by commas)
                </label>
                <textarea
                  value={ecgManualInput}
                  onChange={handleEcgInputChange}
                  rows={3}
                  className="block w-full p-4 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all font-mono text-xs leading-normal"
                />
              </div>
            </div>
          )}

          {activeModel === "heart" && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3 border-b border-[#E6E1D3] pb-3 mb-2">
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider">
                  Patient Clinical Parameters Form
                </label>
                <div className="flex gap-2">
                  {HEART_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadHeartPreset(p)}
                      className="px-3 py-1.5 rounded-lg border border-[#E6E1D3] hover:bg-[#FAF6E8] bg-white text-xs font-semibold text-[#8C6B1F] cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <span>👨‍⚕️</span>
                      <span>Preset {idx === 0 ? "A" : "B"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Heart Form Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Age */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Age ({heartForm.age})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={heartForm.age}
                    onChange={(e) => setHeartForm({ ...heartForm, age: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-[#E6E1D3] rounded-lg appearance-none cursor-pointer accent-[#8C6B1F]"
                  />
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Sex
                  </label>
                  <select
                    value={heartForm.sex}
                    onChange={(e) => setHeartForm({ ...heartForm, sex: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={1}>Male (1.0)</option>
                    <option value={0}>Female (0.0)</option>
                  </select>
                </div>

                {/* Chest Pain (cp) */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Chest Pain Type (0-3)
                  </label>
                  <select
                    value={heartForm.cp}
                    onChange={(e) => setHeartForm({ ...heartForm, cp: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={0}>Asymptomatic (0.0)</option>
                    <option value={1}>Typical Angina (1.0)</option>
                    <option value={2}>Atypical Angina (2.0)</option>
                    <option value={3}>Non-anginal Pain (3.0)</option>
                  </select>
                </div>

                {/* resting bp */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Resting BP ({heartForm.trestbps} mm Hg)
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="200"
                    value={heartForm.trestbps}
                    onChange={(e) => setHeartForm({ ...heartForm, trestbps: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-[#E6E1D3] rounded-lg appearance-none cursor-pointer accent-[#8C6B1F]"
                  />
                </div>

                {/* cholestoral */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Cholesterol ({heartForm.chol} mg/dl)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="450"
                    value={heartForm.chol}
                    onChange={(e) => setHeartForm({ ...heartForm, chol: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-[#E6E1D3] rounded-lg appearance-none cursor-pointer accent-[#8C6B1F]"
                  />
                </div>

                {/* fasting sugar */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Fasting Blood Sugar
                  </label>
                  <select
                    value={heartForm.fbs}
                    onChange={(e) => setHeartForm({ ...heartForm, fbs: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={0}>&lt;= 120 mg/dl (0.0)</option>
                    <option value={1}>&gt; 120 mg/dl (1.0)</option>
                  </select>
                </div>

                {/* restecg */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Resting ECG (0-2)
                  </label>
                  <select
                    value={heartForm.restecg}
                    onChange={(e) => setHeartForm({ ...heartForm, restecg: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={0}>Normal (0.0)</option>
                    <option value={1}>ST-T Wave Abnormality (1.0)</option>
                    <option value={2}>Left Ventricular Hypertrophy (2.0)</option>
                  </select>
                </div>

                {/* max heart rate */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Max Heart Rate achieved ({heartForm.thalach})
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    value={heartForm.thalach}
                    onChange={(e) => setHeartForm({ ...heartForm, thalach: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-[#E6E1D3] rounded-lg appearance-none cursor-pointer accent-[#8C6B1F]"
                  />
                </div>

                {/* exercise induced angina */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Exercise Induced Angina
                  </label>
                  <select
                    value={heartForm.exang}
                    onChange={(e) => setHeartForm({ ...heartForm, exang: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={0}>No (0.0)</option>
                    <option value={1}>Yes (1.0)</option>
                  </select>
                </div>

                {/* oldpeak */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    ST Depression / Oldpeak ({heartForm.oldpeak})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="6.2"
                    step="0.1"
                    value={heartForm.oldpeak}
                    onChange={(e) => setHeartForm({ ...heartForm, oldpeak: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#E6E1D3] rounded-lg appearance-none cursor-pointer accent-[#8C6B1F]"
                  />
                </div>

                {/* slope */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Peak exercise ST slope
                  </label>
                  <select
                    value={heartForm.slope}
                    onChange={(e) => setHeartForm({ ...heartForm, slope: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={0}>Upsloping (0.0)</option>
                    <option value={1}>Flat (1.0)</option>
                    <option value={2}>Downsloping (2.0)</option>
                  </select>
                </div>

                {/* ca */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Major Vessels Colored (0-3)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={heartForm.ca}
                    onChange={(e) => setHeartForm({ ...heartForm, ca: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-[#E6E1D3] rounded-lg appearance-none cursor-pointer accent-[#8C6B1F]"
                  />
                </div>

                {/* thal */}
                <div>
                  <label className="block text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-2">
                    Thalassemia defect type (Thal)
                  </label>
                  <select
                    value={heartForm.thal}
                    onChange={(e) => setHeartForm({ ...heartForm, thal: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white border border-[#DCD5C5] rounded-xl text-xs text-[#1C1B18]"
                  >
                    <option value={1}>Normal (1.0)</option>
                    <option value={2}>Fixed Defect (2.0)</option>
                    <option value={3}>Reversible Defect (3.0)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button & Results Card */}
        <div className="mt-8 space-y-6">
          <button
            onClick={handleDiagnose}
            disabled={loading || (activeModel !== "ecg" && activeModel !== "heart" && !selectedFile)}
            className="w-full py-4 px-6 bg-[#1C1B18] text-white hover:bg-[#2E2C26] transition-all rounded-2xl font-sans font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:bg-[#1C1B18] disabled:cursor-not-allowed text-sm shadow-md"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Analyzing Scan Data...</span>
              </div>
            ) : (
              <>
                <MaterialIcon name="online_prediction" className="text-lg" />
                <span>Run Clinical Model Prediction</span>
              </>
            )}
          </button>

          {/* Errors display */}
          {error && (
            <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-4 rounded-2xl flex items-start gap-3">
              <MaterialIcon name="error" className="text-xl text-[#B34515] shrink-0" />
              <div className="text-xs font-semibold leading-relaxed">
                <span className="block font-bold">Prediction Failed:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Prediction Results Display Card */}
          {result && (
            <div className="bg-white border border-[#E6E1D3] rounded-[24px] p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#FAF6E8] pb-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#E6F5EE] text-[#155939] flex items-center justify-center">
                  <MaterialIcon name="fact_check" className="text-sm" />
                </div>
                <h5 className="font-serif text-lg font-bold text-[#1C1B18]">Diagnosis Result</h5>
              </div>

              {/* Standard Output (Bone, Skin, ECG) */}
              {(activeModel === "bone" || activeModel === "skin" || activeModel === "ecg") && (
                <div className="space-y-4 font-sans">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E6E1D3]/50">
                      <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1">
                        Predicted Class
                      </span>
                      <span className="text-base font-bold text-[#1C1B18] uppercase">
                        {result.diagnosis || "Unknown"}
                      </span>
                    </div>

                    <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E6E1D3]/50">
                      <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1">
                        Confidence
                      </span>
                      <span className="text-base font-bold text-[#1C1B18]">
                        {result.confidence !== undefined ? `${result.confidence}%` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  {result.confidence !== undefined && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-[#787363] font-bold">
                        <span>CONFIDENCE CONFIRMATION</span>
                        <span>{result.confidence}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#E6E1D3] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Brain Tumor Output */}
              {activeModel === "brain" && (
                <div className="space-y-3 font-sans text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[#E6E1D3]/50 bg-[#FAF9F5]">
                    <span className="font-semibold text-[#4D493E]">Tumor Found:</span>
                    <span
                      className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                        result.tumor_found
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {result.tumor_found ? "YES" : "NO"}
                    </span>
                  </div>

                  {result.detections && result.detections.length > 0 ? (
                    <div className="space-y-2">
                      <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold">
                        Detections detail ({result.detections.length})
                      </span>
                      <div className="space-y-1.5">
                        {result.detections.map((d, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-2.5 rounded-lg bg-red-50/30 border border-red-200/50 text-[#8C2E0B]"
                          >
                            <span className="font-semibold">
                              🎯 Classification: {d.class.toUpperCase()}
                            </span>
                            <span className="font-bold">Confidence: {d.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/30 border border-emerald-200/50 rounded-xl text-[#155939] font-medium">
                      No anomalies or tumors detected in the scanned MRI slice.
                    </div>
                  )}
                </div>
              )}

              {/* Heart Risk Output */}
              {activeModel === "heart" && (
                <div className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E6E1D3]/50">
                      <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1">
                        Risk Prediction
                      </span>
                      <span
                        className={`text-base font-bold uppercase ${
                          result.risk_prediction === 1 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {result.diagnosis || (result.risk_prediction === 1 ? "High Risk" : "Low Risk")}
                      </span>
                    </div>

                    <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E6E1D3]/50">
                      <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1">
                        Disease Probability
                      </span>
                      <span className="text-base font-bold text-[#1C1B18]">
                        {result.disease_probability}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-[#787363] font-bold">
                      <span>ESTIMATED HEALTH PROBABILITY SCALE</span>
                      <span>{result.disease_probability}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#E6E1D3] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          result.risk_prediction === 1 ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${result.disease_probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Chest Pathology Output */}
              {activeModel === "chest" && result.pathology_probabilities && (
                <div className="space-y-3 font-sans">
                  <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-2">
                    Pathology Probability Breakdowns
                  </span>

                  <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {Object.entries(result.pathology_probabilities)
                      .sort((a, b) => b[1] - a[1]) // Sort highest risk first
                      .map(([name, prob]) => (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs text-[#1C1B18]">
                            <span className="font-semibold">{name}</span>
                            <span className="font-bold text-[#8C6B1F]">{prob}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#FAF6E8] border border-[#E6E1D3]/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#8C6B1F] rounded-full transition-all duration-300"
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* AI Clinical Recommendations (OpenCode Zen generated) */}
              {result && (result.ai_explanation || (result.ai_suggestions && result.ai_suggestions.length > 0)) && (
                <div className="mt-6 pt-6 border-t border-[#E6E1D3]/50 space-y-5 font-sans text-xs">
                  <h6 className="font-serif text-sm font-bold text-[#1C1B18] flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-[#8C6B1F] rounded-full" />
                    <MaterialIcon name="psychology" className="text-base text-[#8C6B1F]" />
                    AI Clinical Insights & Recommendations
                  </h6>
                  
                  {result.ai_explanation && (
                    <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/40 text-[#4D493E] leading-relaxed">
                      <strong className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1.5">Clinical Explanation & Rationale</strong>
                      {result.ai_explanation}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.affected_parts && result.affected_parts.length > 0 && (
                      <div className="space-y-2 bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/40">
                        <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1">Affected Anatomical Parts</span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.affected_parts.map((part, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white text-[#8C6B1F] border border-[#E6E1D3]/50 rounded-full font-medium text-[10px] uppercase tracking-wider">
                              {STAGE_NAME_MAP[part] || `Part ${part}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.medicines && result.medicines.length > 0 && (
                      <div className="space-y-2 bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/40">
                        <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold mb-1.5">Suggested Medications / Treatments</span>
                        <ul className="space-y-1.5 text-[#4D493E]">
                          {result.medicines.map((med, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <MaterialIcon name="medical_services" className="text-sm text-[#8C6B1F]" />
                              <span className="capitalize">{med}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {result.ai_suggestions && result.ai_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="block text-[10px] text-[#787363] uppercase tracking-wider font-bold">Actionable Patient Care Instructions</span>
                      <div className="space-y-2">
                        {result.ai_suggestions.map((sug, i) => (
                          <div key={i} className="flex gap-2.5 items-start p-3.5 rounded-2xl bg-emerald-50/20 border border-emerald-100/50 text-[#155939]">
                            <MaterialIcon name="check_circle" className="text-base text-emerald-600 mt-0.5" />
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

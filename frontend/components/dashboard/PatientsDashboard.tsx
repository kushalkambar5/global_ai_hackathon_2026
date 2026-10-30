"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface Scan {
  id: string;
  scanType: string;
  predictionResult: any;
  status: string;
  aiExplanation: string;
  createdAt: string;
  completedAt: string;
  inputImageUrl?: string;
  medicines?: string[];
}

interface Metric {
  id: string;
  steps: number;
  heartRateAvg: number;
  caloriesBurnt: string;
  spo2Percentage: string;
  sleepDurationMinutes: number;
  metricDate: string;
  source?: string;
}

interface Report {
  id: string;
  title: string;
  reportType: string;
  fileUrl: string;
  reportDate: string;
  description: string;
  medicines: string[];
}

interface Patient {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  heightCm: string | null;
  weightKg: string | null;
  allergiesJson: string | null;
  chronicConditionsJson: string | null;
  currentMedicationsJson: string | null;
  emergencyContactPhone: string | null;
  profileImageUrl: string | null;
  assignedDoctorId: string | null;
  assignedAt: string | null;
  assignmentStatus: string | null;
  scans: Scan[];
  metrics: Metric[];
  reports: Report[];
}

const BODY_PARTS = [
  { stage: 1, name: "Skeleton Structure" },
  { stage: 2, name: "Circulatory System" },
  { stage: 3, name: "Urinary System" },
  { stage: 4, name: "Digestive System" },
  { stage: 5, name: "Gallbladder" },
  { stage: 6, name: "Liver" },
  { stage: 7, name: "Diaphragm" },
  { stage: 8, name: "Heart" },
  { stage: 9, name: "Lungs" },
  { stage: 10, name: "Brain" },
  { stage: 11, name: "Eyes" },
  { stage: 12, name: "Muscular System" },
  { stage: 13, name: "Full Body (Skin)" },
];

const ECG_TEST_SIGNAL = Array(187).fill(0).map((_, i) => Math.sin(i / 10) * 0.5 + Math.cos(i / 5) * 0.3);

export default function PatientsDashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Tabs for the selected patient workspace
  const [activeTab, setActiveTab] = useState<"profile" | "metrics" | "scans" | "reports" | "chat" | "tasks-diet">("profile");

  // --- ACTIONS LOADING STATES ---
  const [saveLoading, setSaveLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [metricLoading, setMetricLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // --- TAB 1: EDIT PROFILE STATE ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    heightCm: "",
    weightKg: "",
    allergiesJson: "",
    chronicConditionsJson: "",
    currentMedicationsJson: "",
    emergencyContactPhone: "",
  });

  // --- TAB 2: MANUAL METRIC STATE ---
  const [metricForm, setMetricForm] = useState({
    metricDate: new Date().toISOString().split("T")[0],
    steps: "",
    heartRateAvg: "",
    spo2Percentage: "",
    sleepDurationMinutes: "",
  });

  // --- TAB 3: AI DIAGNOSTICS STATE ---
  const [scanModel, setScanModel] = useState<"bone" | "brain" | "chest" | "skin" | "ecg" | "heart">("chest");
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanFilePreview, setScanFilePreview] = useState<string | null>(null);
  const [ecgManualInput, setEcgManualInput] = useState<string>(ECG_TEST_SIGNAL.join(", "));
  const [heartForm, setHeartForm] = useState({
    age: 50,
    sex: 1,
    cp: 1,
    trestbps: 120,
    chol: 200,
    fbs: 0,
    restecg: 1,
    thalach: 150,
    exang: 0,
    oldpeak: 1.0,
    slope: 1,
    ca: 0,
    thal: 2,
  });
  const [scanDiagnosticResult, setScanDiagnosticResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // --- TAB 4: MEDICAL REPORT STATE ---
  const [reportForm, setReportForm] = useState({
    title: "",
    reportType: "PRESCRIPTION",
    selectedPartStage: "13", // default to Full Body
    description: "",
  });
  const [reportFile, setReportFile] = useState<File | null>(null);

  // --- TAB 6: TASKS & DIET STATE ---
  const [tdTasks, setTdTasks] = useState<any[]>([]);
  const [tdDietPlans, setTdDietPlans] = useState<any[]>([]);
  const [tdLoading, setTdLoading] = useState(false);
  const [tdActionLoading, setTdActionLoading] = useState(false);
  const [tdToast, setTdToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [tdDietView, setTdDietView] = useState<"tasks" | "diet">("tasks");
  const [tdEditDiet, setTdEditDiet] = useState<any | null>(null);
  const [tdTaskForm, setTdTaskForm] = useState({
    taskType: "task_based" as "task_based" | "goal_based",
    taskName: "",
    taskDescription: "",
    goalMetric: "daily_steps" as "daily_steps" | "calories_burn" | "min_sleep",
    goalTarget: "",
    freqIntervalDays: "1",
  });
  const [tdShowTaskForm, setTdShowTaskForm] = useState(false);
  const [tdShowDietForm, setTdShowDietForm] = useState(false);
  const [tdDietForm, setTdDietForm] = useState({
    title: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    breakfastMeals: "",
    breakfastTime: "08:30",
    lunchMeals: "",
    lunchTime: "13:00",
    dinnerMeals: "",
    dinnerTime: "20:00",
    dailyCalories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
    waterMl: "2000",
    healthGoals: "",
    doctorNotes: "",
  });
  const [tdExpandedTask, setTdExpandedTask] = useState<string | null>(null);
  const [tdTaskHistories, setTdTaskHistories] = useState<Record<string, any[]>>({});

  const tdShowToast = (msg: string, ok = true) => {
    setTdToast({ msg, ok });
    setTimeout(() => setTdToast(null), 3500);
  };

  const fetchTdData = async (patientId: string) => {
    setTdLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        fetch(`/api/tasks/patient/${patientId}`),
        fetch(`/api/diet/patient/${patientId}`),
      ]);
      if (tRes.ok) setTdTasks((await tRes.json()).tasks || []);
      if (dRes.ok) setTdDietPlans((await dRes.json()).dietPlans || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTdLoading(false);
    }
  };

  const fetchTaskHistory = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/history`);
    if (res.ok) {
      const data = await res.json();
      setTdTaskHistories((prev) => ({ ...prev, [taskId]: data.history || [] }));
    }
  };

  const handleCreateTask = async (patientId: string) => {
    setTdActionLoading(true);
    try {
      const body: any = {
        taskType: tdTaskForm.taskType,
        taskDescription: tdTaskForm.taskDescription,
      };
      if (tdTaskForm.taskType === "task_based") {
        body.taskName = tdTaskForm.taskName;
      } else {
        body.goalMetric = tdTaskForm.goalMetric;
        body.goalTarget = parseFloat(tdTaskForm.goalTarget);
        body.freqIntervalDays = parseInt(tdTaskForm.freqIntervalDays);
      }
      const res = await fetch(`/api/tasks/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      tdShowToast("Task created!");
      setTdShowTaskForm(false);
      setTdTaskForm({ taskType: "task_based", taskName: "", taskDescription: "", goalMetric: "daily_steps", goalTarget: "", freqIntervalDays: "1" });
      fetchTdData(patientId);
    } catch (e: any) {
      tdShowToast(e.message, false);
    } finally {
      setTdActionLoading(false);
    }
  };

  const handleDeactivateTask = async (taskId: string, patientId: string) => {
    setTdActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove task");
      tdShowToast("Task removed.");
      fetchTdData(patientId);
    } catch (e: any) {
      tdShowToast(e.message, false);
    } finally {
      setTdActionLoading(false);
    }
  };

  const handleCreateDiet = async (patientId: string) => {
    setTdActionLoading(true);
    try {
      const body = {
        title: tdDietForm.title || "Manual Diet Plan",
        startDate: tdDietForm.startDate || null,
        endDate: tdDietForm.endDate || null,
        dailySchedule: {
          breakfast: { time: tdDietForm.breakfastTime, meals: tdDietForm.breakfastMeals.split(",").map(x => x.trim()).filter(Boolean) },
          lunch: { time: tdDietForm.lunchTime, meals: tdDietForm.lunchMeals.split(",").map(x => x.trim()).filter(Boolean) },
          dinner: { time: tdDietForm.dinnerTime, meals: tdDietForm.dinnerMeals.split(",").map(x => x.trim()).filter(Boolean) },
        },
        nutritionalTargets: {
          dailyCalories: parseInt(tdDietForm.dailyCalories) || null,
          proteinG: parseInt(tdDietForm.proteinG) || null,
          carbsG: parseInt(tdDietForm.carbsG) || null,
          fatG: parseInt(tdDietForm.fatG) || null,
          waterMl: parseInt(tdDietForm.waterMl) || null,
        },
        healthGoals: tdDietForm.healthGoals.split(",").map(x => x.trim()).filter(Boolean),
        doctorNotes: tdDietForm.doctorNotes || null,
        status: "ACTIVE",
      };

      const res = await fetch(`/api/diet/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign diet plan");
      tdShowToast("Diet plan assigned manually!");
      setTdShowDietForm(false);
      setTdDietForm({
        title: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        breakfastMeals: "",
        breakfastTime: "08:30",
        lunchMeals: "",
        lunchTime: "13:00",
        dinnerMeals: "",
        dinnerTime: "20:00",
        dailyCalories: "",
        proteinG: "",
        carbsG: "",
        fatG: "",
        waterMl: "2000",
        healthGoals: "",
        doctorNotes: "",
      });
      fetchTdData(patientId);
    } catch (e: any) {
      tdShowToast(e.message, false);
    } finally {
      setTdActionLoading(false);
    }
  };


  const handleDeleteDiet = async (dietId: string, patientId: string) => {
    setTdActionLoading(true);
    try {
      const res = await fetch(`/api/diet/${dietId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      tdShowToast("Diet plan deleted.");
      fetchTdData(patientId);
    } catch (e: any) {
      tdShowToast(e.message, false);
    } finally {
      setTdActionLoading(false);
    }
  };

  const handleSaveDiet = async (patientId: string) => {
    if (!tdEditDiet) return;
    setTdActionLoading(true);
    try {
      const res = await fetch(`/api/diet/${tdEditDiet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorNotes: tdEditDiet.doctorNotes, title: tdEditDiet.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      tdShowToast("Diet plan updated!");
      setTdEditDiet(null);
      fetchTdData(patientId);
    } catch (e: any) {
      tdShowToast(e.message, false);
    } finally {
      setTdActionLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const resp = await fetch("/api/doctor/patients");
      if (!resp.ok) {
        throw new Error("Failed to retrieve patients records.");
      }
      const data = await resp.json();
      setPatients(data.patients || []);
      setDoctorProfileId(data.doctorProfileId || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while loading patient records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Sync editing form when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      setProfileForm({
        fullName: selectedPatient.fullName || "",
        dob: selectedPatient.dateOfBirth || "",
        gender: selectedPatient.gender || "",
        bloodGroup: selectedPatient.bloodGroup || "",
        heightCm: selectedPatient.heightCm || "",
        weightKg: selectedPatient.weightKg || "",
        allergiesJson: selectedPatient.allergiesJson || "",
        chronicConditionsJson: selectedPatient.chronicConditionsJson || "",
        currentMedicationsJson: selectedPatient.currentMedicationsJson || "",
        emergencyContactPhone: selectedPatient.emergencyContactPhone || "",
      });
      setIsEditingProfile(false);
      setScanDiagnosticResult(null);
      setScanError(null);
      setScanFile(null);
      setScanFilePreview(null);
      setTdTasks([]);
      setTdDietPlans([]);
      setTdShowTaskForm(false);
      setTdEditDiet(null);
      setTdTaskHistories({});
      // reset forms
      setMetricForm({
        metricDate: new Date().toISOString().split("T")[0],
        steps: "",
        heartRateAvg: "",
        spo2Percentage: "",
        sleepDurationMinutes: "",
      });
      setReportForm({
        title: "",
        reportType: "PRESCRIPTION",
        selectedPartStage: "13",
        description: "",
      });
      setReportFile(null);
    }
  }, [selectedPatientId, selectedPatient]);

  // Handle image selection preview
  const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScanFile(file);
      setScanFilePreview(URL.createObjectURL(file));
      setScanDiagnosticResult(null);
      setScanError(null);
    }
  };

  // --- API MUTATION HANDLERS ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSaveLoading(true);
    try {
      const resp = await fetch("/api/doctor/update-patient-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientId, ...profileForm }),
      });
      if (!resp.ok) {
        throw new Error(await resp.text() || "Failed to update profile.");
      }
      await fetchPatients();
      setIsEditingProfile(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setMetricLoading(true);
    try {
      const resp = await fetch("/api/doctor/add-patient-metric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          steps: metricForm.steps ? parseInt(metricForm.steps, 10) : undefined,
          heartRateAvg: metricForm.heartRateAvg ? parseInt(metricForm.heartRateAvg, 10) : undefined,
          spo2Percentage: metricForm.spo2Percentage ? parseFloat(metricForm.spo2Percentage) : undefined,
          sleepDurationMinutes: metricForm.sleepDurationMinutes ? parseInt(metricForm.sleepDurationMinutes, 10) : undefined,
          metricDate: metricForm.metricDate,
        }),
      });
      if (!resp.ok) {
        throw new Error(await resp.text() || "Failed to save biometrics.");
      }
      await fetchPatients();
      // Reset form fields
      setMetricForm({
        metricDate: new Date().toISOString().split("T")[0],
        steps: "",
        heartRateAvg: "",
        spo2Percentage: "",
        sleepDurationMinutes: "",
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setMetricLoading(false);
    }
  };

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setScanLoading(true);
    setScanDiagnosticResult(null);
    setScanError(null);

    try {
      let predictResp;
      // 1. Send input payload to Python ML model endpoints via proxy
      if (["bone", "brain", "chest", "skin"].includes(scanModel)) {
        if (!scanFile) {
          throw new Error("An image scan file is required for this diagnostic.");
        }
        const fd = new FormData();
        fd.append("file", scanFile);
        predictResp = await fetch(`/api/models/predict/${scanModel}`, {
          method: "POST",
          body: fd,
        });
      } else if (scanModel === "ecg") {
        const parsed = ecgManualInput
          .split(",")
          .map((x) => parseFloat(x.trim()))
          .filter((x) => !isNaN(x));
        if (parsed.length !== 187) {
          throw new Error("ECG signal must contain exactly 187 values separated by commas.");
        }
        predictResp = await fetch("/api/models/predict/ecg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal: parsed }),
        });
      } else {
        // Heart Model
        predictResp = await fetch("/api/models/predict/heart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(heartForm),
        });
      }

      if (!predictResp.ok) {
        throw new Error(`ML predict server failed with status ${predictResp.status}`);
      }

      const predictionData = await predictResp.json();

      // 2. Persist the scan result to backend diseaseScans table
      const scanTypeMap: Record<string, string> = {
        bone: "BONE_FRACTURE",
        brain: "BRAIN_TUMOR",
        ecg: "ECG",
        heart: "HEART",
        skin: "SKIN",
        chest: "CHEST",
      };

      let modelInputMetadata: any = null;
      if (scanModel === "ecg") {
        modelInputMetadata = { signal: ecgManualInput.split(",").map(x => parseFloat(x.trim())) };
      } else if (scanModel === "heart") {
        modelInputMetadata = heartForm;
      }

      const saveFd = new FormData();
      saveFd.append("patientId", selectedPatientId);
      saveFd.append("scanType", scanTypeMap[scanModel]);
      saveFd.append("predictionResult", JSON.stringify(predictionData));
      if (modelInputMetadata) {
        saveFd.append("modelInputMetadata", JSON.stringify(modelInputMetadata));
      }
      if (scanFile) {
        saveFd.append("file", scanFile);
      }

      const saveResp = await fetch("/api/scans", {
        method: "POST",
        body: saveFd,
      });

      if (!saveResp.ok) {
        throw new Error("Could not log diagnostic scan in clinical database.");
      }

      const savedScan = await saveResp.json();
      setScanDiagnosticResult({
        ...predictionData,
        aiExplanation: savedScan.aiExplanation,
        medicines: savedScan.medicines,
      });

      await fetchPatients();
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "An unexpected error occurred during prediction.");
    } finally {
      setScanLoading(false);
    }
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !reportForm.title) return;
    setReportLoading(true);

    try {
      const selectedPart = BODY_PARTS.find(p => p.stage.toString() === reportForm.selectedPartStage);
      const fd = new FormData();
      fd.append("patientId", selectedPatientId);
      fd.append("title", reportForm.title);
      fd.append("reportType", reportForm.reportType);
      fd.append("description", reportForm.description);
      fd.append("selectedPartStage", reportForm.selectedPartStage);
      if (selectedPart) {
        fd.append("selectedPartName", selectedPart.name);
      }
      if (reportFile) {
        fd.append("file", reportFile);
      }

      const resp = await fetch("/api/medical-reports", {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        throw new Error(await resp.text() || "Failed to log medical report.");
      }

      await fetchPatients();
      // Reset forms
      setReportForm({
        title: "",
        reportType: "PRESCRIPTION",
        selectedPartStage: "13",
        description: "",
      });
      setReportFile(null);
      alert("Medical report and prescription logged successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  // --- STATS COMPUTATION FOR EHR HOME ---
  const totalPatients = patients.length;
  const totalScans = patients.reduce((acc, p) => acc + (p.scans?.length || 0), 0);
  const totalReports = patients.reduce((acc, p) => acc + (p.reports?.length || 0), 0);
  const myPatientsCount = patients.filter(p => p.assignedDoctorId === doctorProfileId && p.assignmentStatus === "ACTIVE").length;

  const filteredPatients = patients.filter((p) => {
    return (
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate age helper
  const calculateAge = (dobString: string | null) => {
    if (!dobString) return "N/A";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[700px] text-[#1C1B18] font-sans antialiased">
      
      {/* LEFT SIDEBAR: Patient Directory */}
      <div className="w-full lg:w-[360px] bg-white border border-[#E6E1D3] rounded-[32px] flex flex-col overflow-hidden shrink-0 shadow-xs">
        
        {/* Title Area */}
        <div className="p-5 border-b border-[#FAF6E8] bg-[#FAF9F5] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-serif text-lg font-bold text-[#1C1B18]">Clinical Directory</h2>
            </div>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EAF3FB] border border-[#C8DEF5] text-[#1C5396]">
              {patients.length} Total
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#787363]">
              <MaterialIcon name="search" className="text-lg" />
            </span>
            <input
              type="text"
              placeholder="Search by patient name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCD5C5] rounded-2xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] text-xs font-semibold"
            />
          </div>
        </div>

        {/* Patient Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#FAF9F5]/30">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <svg className="animate-spin h-6 w-6 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[10px] font-bold text-[#787363] uppercase">Assembling Directory...</span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="py-20 text-center text-[#787363] space-y-2">
              <MaterialIcon name="person_off" className="text-3xl text-[#DCD5C5]" />
              <p className="text-xs font-bold">No patient profiles match the query</p>
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = selectedPatientId === p.id;
              const isAssignedToMe = p.assignedDoctorId === doctorProfileId && p.assignmentStatus === "ACTIVE";

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-white border-[#8C6B1F] shadow-sm ring-1 ring-[#8C6B1F]"
                      : "bg-white border-[#E6E1D3] hover:border-[#8C6B1F]/60 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FAF6E8] border border-[#FAF6E8] shrink-0">
                      <img
                        src={p.profileImageUrl || "/avatars/avatar1.svg"}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Details */}
                    <div className="min-w-0">
                      <h4 className="font-serif font-bold text-xs text-[#1C1B18] leading-tight truncate">{p.fullName}</h4>
                      <p className="text-[9px] text-[#787363] font-mono leading-none mt-1 truncate">{p.email}</p>
                      
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-[#FAF6E8] border rounded text-[#8C6B1F]">
                          {calculateAge(p.dateOfBirth)}
                        </span>
                        {p.bloodGroup && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-[#FAF6E8] border rounded text-[#8C6B1F]">
                            {p.bloodGroup}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="shrink-0">
                    {isAssignedToMe ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block border-2 border-white shadow-xs" title="My Patient" />
                    ) : p.assignedDoctorId ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A8A28E] block border-2 border-white shadow-xs" title="Assigned Elsewhere" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-50 block border-2 border-white shadow-xs" title="Unassigned Patient" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT WORKSPACE: EHR Dashboard or Patient Chart */}
      <div className="flex-1 bg-white border border-[#E6E1D3] rounded-[32px] flex flex-col overflow-hidden shadow-xs">
        
        {selectedPatient ? (
          // WORKSPACE 1: ACTIVE PATIENT PROFILE
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Patient Header Summary */}
            <div className="p-6 border-b border-[#FAF6E8] bg-[#FAF9F5] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white border shrink-0">
                  <img
                    src={selectedPatient.profileImageUrl || "/avatars/avatar1.svg"}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-xl font-bold text-[#1C1B18]">{selectedPatient.fullName}</h3>
                    {selectedPatient.assignedDoctorId === doctorProfileId && selectedPatient.assignmentStatus === "ACTIVE" ? (
                      <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
                        My Patient
                      </span>
                    ) : selectedPatient.assignedDoctorId ? (
                      <span className="text-[8px] font-bold bg-[#FAF6E8] text-[#787363] border px-2 py-0.5 rounded uppercase tracking-wider">
                        Assigned Elsewhere
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold bg-[#FAF0E6] text-[#B34515] border border-[#F2C5B0] px-2 py-0.5 rounded uppercase tracking-wider">
                        Unassigned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#787363] leading-none mt-1.5">{selectedPatient.email}</p>
                </div>
              </div>

              {/* Close Patient Button */}
              <button
                onClick={() => setSelectedPatientId(null)}
                className="px-3.5 py-1.5 border border-[#E6E1D3] hover:border-[#8C6B1F] hover:bg-[#FAF6E8]/30 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer text-[#8C6B1F]"
              >
                <MaterialIcon name="close" className="text-sm" />
                <span>Close Workspace</span>
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="border-b border-[#FAF6E8] flex bg-[#FAF9F5]/40 px-6">
              {[
                { id: "profile", label: "Patient Profile", icon: "assignment_ind" },
                { id: "metrics", label: "Biometrics & Vitals", icon: "monitoring" },
                { id: "scans", label: "AI Disease Scans", icon: "biotech" },
                { id: "reports", label: "Reports & Rx", icon: "description" },
                { id: "tasks-diet", label: "Tasks & Diet", icon: "task_alt" },
                { id: "chat", label: "Consultation Chat", icon: "forum" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === "tasks-diet" && selectedPatientId) fetchTdData(selectedPatientId);
                    }}
                    className={`py-3.5 px-4 font-sans text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                      isActive
                        ? "border-[#8C6B1F] text-[#8C6B1F]"
                        : "border-transparent text-[#787363] hover:text-[#1C1B18]"
                    }`}
                  >
                    <MaterialIcon name={tab.icon} className="text-sm" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
              
              {/* TAB 1: PROFILE MANAGEMENT */}
              {activeTab === "profile" && (
                <div className="max-w-4xl space-y-6">
                  <div className="flex justify-between items-center border-b border-[#FAF6E8] pb-3">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18]">Biological Profile & Clinical History</h4>
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="px-4 py-2 border border-[#8C6B1F] text-[#8C6B1F] hover:bg-[#FAF6E8] rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <MaterialIcon name={isEditingProfile ? "close" : "edit"} className="text-sm" />
                      <span>{isEditingProfile ? "Cancel" : "Edit Profile"}</span>
                    </button>
                  </div>

                  {!isEditingProfile ? (
                    // Display Mode
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/50">
                          <span className="block text-[9px] font-bold text-[#787363] uppercase">Age</span>
                          <span className="font-serif text-lg font-bold text-[#1C1B18]">
                            {selectedPatient.dateOfBirth ? calculateAge(selectedPatient.dateOfBirth) : "N/A"}
                          </span>
                        </div>
                        <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/50">
                          <span className="block text-[9px] font-bold text-[#787363] uppercase">Gender</span>
                          <span className="font-serif text-lg font-bold text-[#1C1B18] capitalize">
                            {selectedPatient.gender || "N/A"}
                          </span>
                        </div>
                        <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/50">
                          <span className="block text-[9px] font-bold text-[#787363] uppercase">Blood Group</span>
                          <span className="font-serif text-lg font-bold text-[#1C1B18]">
                            {selectedPatient.bloodGroup || "N/A"}
                          </span>
                        </div>
                        <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D3]/50">
                          <span className="block text-[9px] font-bold text-[#787363] uppercase">Dimensions</span>
                          <span className="font-serif text-lg font-bold text-[#1C1B18]">
                            {selectedPatient.heightCm ? `${selectedPatient.heightCm} cm` : "N/A"} / {selectedPatient.weightKg ? `${selectedPatient.weightKg} kg` : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-[#E6E1D3]/70 p-5 rounded-2xl space-y-3">
                          <span className="block text-[10px] font-bold text-[#787363] uppercase tracking-wider">Allergies & Sensitivities</span>
                          <div className="text-xs leading-relaxed text-[#1C1B18] bg-[#FAF9F5]/40 p-3.5 border rounded-xl italic">
                            {selectedPatient.allergiesJson || "No allergies documented."}
                          </div>
                        </div>

                        <div className="bg-white border border-[#E6E1D3]/70 p-5 rounded-2xl space-y-3">
                          <span className="block text-[10px] font-bold text-[#787363] uppercase tracking-wider">Chronic Conditions</span>
                          <div className="text-xs leading-relaxed text-[#1C1B18] bg-[#FAF9F5]/40 p-3.5 border rounded-xl italic">
                            {selectedPatient.chronicConditionsJson || "No chronic conditions documented."}
                          </div>
                        </div>

                        <div className="bg-white border border-[#E6E1D3]/70 p-5 rounded-2xl space-y-3">
                          <span className="block text-[10px] font-bold text-[#787363] uppercase tracking-wider">Active Medications</span>
                          <div className="text-xs leading-relaxed text-[#1C1B18] bg-[#FAF9F5]/40 p-3.5 border rounded-xl italic">
                            {selectedPatient.currentMedicationsJson || "No prescriptions active."}
                          </div>
                        </div>

                        <div className="bg-white border border-[#E6E1D3]/70 p-5 rounded-2xl space-y-3">
                          <span className="block text-[10px] font-bold text-[#787363] uppercase tracking-wider">Emergency Contact</span>
                          <div className="text-xs leading-relaxed text-[#1C1B18] bg-[#FAF9F5]/40 p-3.5 border rounded-xl flex items-center gap-2">
                            <MaterialIcon name="call" className="text-sm text-[#8C6B1F]" />
                            <span>{selectedPatient.emergencyContactPhone || "No contact logged."}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Editing Mode Form
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                        <div>
                          <label className="block text-[#787363] mb-1">Full Name</label>
                          <input
                            type="text"
                            value={profileForm.fullName}
                            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[#787363] mb-1">Date of Birth (YYYY-MM-DD)</label>
                          <input
                            type="date"
                            value={profileForm.dob}
                            onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[#787363] mb-1">Gender</label>
                          <select
                            value={profileForm.gender}
                            onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                            className="w-full p-2.5 border rounded-lg bg-white"
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[#787363] mb-1">Blood Group</label>
                          <input
                            type="text"
                            placeholder="e.g. A+, O-, B+"
                            value={profileForm.bloodGroup}
                            onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[#787363] mb-1">Height (cm)</label>
                          <input
                            type="number"
                            value={profileForm.heightCm}
                            onChange={(e) => setProfileForm({ ...profileForm, heightCm: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[#787363] mb-1">Weight (kg)</label>
                          <input
                            type="number"
                            value={profileForm.weightKg}
                            onChange={(e) => setProfileForm({ ...profileForm, weightKg: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[#787363] mb-1">Emergency Contact Phone</label>
                          <input
                            type="text"
                            value={profileForm.emergencyContactPhone}
                            onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[#787363] mb-1">Allergies & Sensitivities</label>
                          <textarea
                            rows={3}
                            value={profileForm.allergiesJson}
                            onChange={(e) => setProfileForm({ ...profileForm, allergiesJson: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                            placeholder="Detail food/drug allergies..."
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[#787363] mb-1">Chronic Conditions</label>
                          <textarea
                            rows={3}
                            value={profileForm.chronicConditionsJson}
                            onChange={(e) => setProfileForm({ ...profileForm, chronicConditionsJson: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                            placeholder="Detail cardiovascular, diabetes, respiratory chronic issues..."
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[#787363] mb-1">Current Prescriptions / Medications</label>
                          <textarea
                            rows={3}
                            value={profileForm.currentMedicationsJson}
                            onChange={(e) => setProfileForm({ ...profileForm, currentMedicationsJson: e.target.value })}
                            className="w-full p-2.5 border rounded-lg"
                            placeholder="List medicine dosages currently active..."
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 border rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saveLoading}
                          className="px-5 py-2.5 bg-[#8C6B1F] text-white hover:bg-[#705518] disabled:bg-gray-400 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
                        >
                          {saveLoading ? "Saving..." : "Save Record Changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: HEALTH TELEMETRY / BIOMETRICS */}
              {activeTab === "metrics" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  
                  {/* Metric Logs List */}
                  <div className="xl:col-span-2 space-y-4">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18]">Smartwatch Sync Telemetry History</h4>
                    
                    {selectedPatient.metrics.length === 0 ? (
                      <div className="p-8 border border-dashed border-[#E6E1D3] rounded-2xl text-center text-[#787363]">
                        <MaterialIcon name="history" className="text-3xl text-[#DCD5C5] mb-1" />
                        <p className="text-xs font-semibold">No smartwatch biometrics logged for this patient yet.</p>
                      </div>
                    ) : (
                      <div className="border border-[#E6E1D3] rounded-2xl overflow-hidden shadow-2xs">
                        <table className="min-w-full divide-y divide-[#FAF6E8] text-xs">
                          <thead className="bg-[#FAF9F5] text-[#787363]">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold uppercase">Date</th>
                              <th className="px-4 py-3 text-left font-bold uppercase">Steps</th>
                              <th className="px-4 py-3 text-left font-bold uppercase">Heart Avg</th>
                              <th className="px-4 py-3 text-left font-bold uppercase">SpO2</th>
                              <th className="px-4 py-3 text-left font-bold uppercase">Sleep</th>
                              <th className="px-4 py-3 text-right font-bold uppercase">Source</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#FAF6E8] bg-white text-[#1C1B18]">
                            {selectedPatient.metrics.slice().sort((a, b) => b.metricDate.localeCompare(a.metricDate)).map((m) => (
                              <tr key={m.id} className="hover:bg-[#FAF6E8]/30">
                                <td className="px-4 py-3 whitespace-nowrap font-bold text-[11px]">{m.metricDate}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{m.steps ? m.steps.toLocaleString() : "—"}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-rose-600 font-semibold">{m.heartRateAvg ? `${m.heartRateAvg} bpm` : "—"}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-blue-600 font-semibold">{m.spo2Percentage ? `${parseFloat(m.spo2Percentage)}%` : "—"}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{m.sleepDurationMinutes ? `${(m.sleepDurationMinutes / 60).toFixed(1)} hrs` : "—"}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                                    m.source === "HEALTH_CONNECT"
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                      : "bg-amber-50 border-amber-200 text-amber-600"
                                  }`}>
                                    {m.source}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Manual Metric Logger */}
                  <div className="xl:col-span-1 bg-[#FAF9F5] border border-[#E6E1D3] rounded-[24px] p-5 space-y-4">
                    <h4 className="font-serif text-sm font-bold text-[#1C1B18]">Log Daily Vitals / Telemetry</h4>
                    
                    <form onSubmit={handleLogMetric} className="space-y-3 text-xs font-semibold">
                      <div>
                        <label className="block text-[#787363] mb-1">Target Log Date</label>
                        <input
                          type="date"
                          value={metricForm.metricDate}
                          onChange={(e) => setMetricForm({ ...metricForm, metricDate: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[#787363] mb-1">Steps Count</label>
                        <input
                          type="number"
                          value={metricForm.steps}
                          onChange={(e) => setMetricForm({ ...metricForm, steps: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          placeholder="e.g. 7000"
                        />
                      </div>
                      <div>
                        <label className="block text-[#787363] mb-1">Heart Rate Avg (BPM)</label>
                        <input
                          type="number"
                          value={metricForm.heartRateAvg}
                          onChange={(e) => setMetricForm({ ...metricForm, heartRateAvg: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          placeholder="e.g. 75"
                        />
                      </div>
                      <div>
                        <label className="block text-[#787363] mb-1">Blood Oxygen SpO2 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={metricForm.spo2Percentage}
                          onChange={(e) => setMetricForm({ ...metricForm, spo2Percentage: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          placeholder="e.g. 98.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[#787363] mb-1">Sleep Duration (Minutes)</label>
                        <input
                          type="number"
                          value={metricForm.sleepDurationMinutes}
                          onChange={(e) => setMetricForm({ ...metricForm, sleepDurationMinutes: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          placeholder="e.g. 480"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={metricLoading}
                        className="w-full mt-2 py-2.5 bg-[#1C1B18] text-white hover:bg-[#32302A] disabled:bg-gray-400 rounded-xl font-bold uppercase transition-colors tracking-wide cursor-pointer flex items-center justify-center gap-1"
                      >
                        {metricLoading ? "Saving Log..." : "Log Patient Metric"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: AI DIAGNOSTIC SCANS */}
              {activeTab === "scans" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                  
                  {/* Scan History Feed */}
                  <div className="space-y-4">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18]">Diagnostic Scans History ({selectedPatient.scans.length})</h4>
                    
                    {selectedPatient.scans.length === 0 ? (
                      <div className="p-8 border border-dashed border-[#E6E1D3] rounded-2xl text-center text-[#787363]">
                        <MaterialIcon name="biotech" className="text-3xl text-[#DCD5C5] mb-1" />
                        <p className="text-xs font-semibold">No AI diagnostics executed for this patient yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedPatient.scans.map((scan) => (
                          <div key={scan.id} className="p-4 border border-[#E6E1D3] bg-white rounded-2xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-[#FAF6E8] border border-[#E6E1D3] text-[#8C6B1F] uppercase">
                                  {scan.scanType.replace("_", " ")}
                                </span>
                                <p className="text-[10px] text-[#787363] mt-1">Logged: {new Date(scan.createdAt).toLocaleString()}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-600 uppercase">
                                {scan.status}
                              </span>
                            </div>

                            {scan.inputImageUrl && (
                              <div className="w-24 h-24 rounded-lg overflow-hidden border">
                                <img src={scan.inputImageUrl} alt="scan payload" className="w-full h-full object-cover" />
                              </div>
                            )}

                            {scan.predictionResult && (
                              <div className="bg-[#FAF9F5] p-3 border rounded-xl text-xs font-semibold">
                                <span className="block text-[8px] text-[#787363] uppercase">AI Diagnostics</span>
                                <p className="text-[#8C6B1F] mt-0.5 font-serif text-sm">
                                  Diagnosis: {scan.predictionResult.diagnosis || scan.predictionResult.diagnosis_result || (scan.predictionResult.tumor_found ? "Tumor Found" : "Negative / Normal Risk")}
                                </p>
                                {scan.predictionResult.confidence !== undefined && (
                                  <p className="text-[10px] text-[#787363] mt-0.5">Confidence: {(scan.predictionResult.confidence * 100).toFixed(1)}%</p>
                                )}
                              </div>
                            )}

                            {scan.aiExplanation && (
                              <p className="text-xs leading-relaxed text-[#787363]">{scan.aiExplanation}</p>
                            )}

                            {scan.medicines && scan.medicines.length > 0 && (
                              <div>
                                <span className="block text-[8px] font-bold text-[#787363] uppercase">Recommended Medicines:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {scan.medicines.map((med: string, idx: number) => (
                                    <span key={idx} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100 rounded">
                                      {med}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scan Execution Form */}
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[24px] p-6 space-y-4">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18] flex items-center gap-1.5">
                      <MaterialIcon name="biotech" className="text-[#8C6B1F]" />
                      <span>Execute AI Diagnostics Scan</span>
                    </h4>

                    <form onSubmit={handleRunScan} className="space-y-4 text-xs font-semibold">
                      <div>
                        <label className="block text-[#787363] mb-1">Select Diagnostic Model</label>
                        <select
                          value={scanModel}
                          onChange={(e) => {
                            setScanModel(e.target.value as any);
                            setScanFile(null);
                            setScanFilePreview(null);
                            setScanDiagnosticResult(null);
                            setScanError(null);
                          }}
                          className="w-full p-2.5 border rounded-lg bg-white"
                        >
                          <option value="chest">Chest X-Ray Pneumonia (Image)</option>
                          <option value="brain">Brain Tumor Detection (Image MRI)</option>
                          <option value="skin">Skin Cancer Diagnosis (Image)</option>
                          <option value="bone">Bone Fracture Classifier (Image)</option>
                          <option value="ecg">ECG Heart Arrhythmia (Signal Matrix)</option>
                          <option value="heart">Coronary Heart Disease (Risk Form)</option>
                        </select>
                      </div>

                      {/* IMAGE UPLOAD PANEL */}
                      {["chest", "brain", "skin", "bone"].includes(scanModel) && (
                        <div className="space-y-2">
                          <label className="block text-[#787363]">Upload Scan Image File</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScanFileChange}
                            className="w-full p-2 border rounded-lg bg-white"
                            required
                          />
                          {scanFilePreview && (
                            <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border relative bg-black">
                              <img src={scanFilePreview} alt="scan preview" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* ECG DATA MATRIX PANEL */}
                      {scanModel === "ecg" && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-[#787363]">ECG Signal (187 comma-separated numbers)</label>
                            <button
                              type="button"
                              onClick={() => setEcgManualInput(ECG_TEST_SIGNAL.join(", "))}
                              className="text-[9px] font-bold text-[#8C6B1F] hover:underline"
                            >
                              Load Mock Signal
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={ecgManualInput}
                            onChange={(e) => setEcgManualInput(e.target.value)}
                            className="w-full p-2 border rounded-lg font-mono text-[10px]"
                            required
                          />
                        </div>
                      )}

                      {/* HEART PARAMETERS FORM */}
                      {scanModel === "heart" && (
                        <div className="grid grid-cols-2 gap-3 bg-white p-3 border rounded-xl">
                          <div>
                            <label className="block text-[9px] text-[#787363]">Resting BP (mmHg)</label>
                            <input
                              type="number"
                              value={heartForm.trestbps}
                              onChange={(e) => setHeartForm({ ...heartForm, trestbps: parseInt(e.target.value) })}
                              className="w-full p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#787363]">Serum Chol (mg/dl)</label>
                            <input
                              type="number"
                              value={heartForm.chol}
                              onChange={(e) => setHeartForm({ ...heartForm, chol: parseInt(e.target.value) })}
                              className="w-full p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#787363]">Max Heart Rate (bpm)</label>
                            <input
                              type="number"
                              value={heartForm.thalach}
                              onChange={(e) => setHeartForm({ ...heartForm, thalach: parseInt(e.target.value) })}
                              className="w-full p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#787363]">ST depression (oldpeak)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={heartForm.oldpeak}
                              onChange={(e) => setHeartForm({ ...heartForm, oldpeak: parseFloat(e.target.value) })}
                              className="w-full p-1.5 border rounded"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={scanLoading}
                        className="w-full py-3 bg-[#8C6B1F] text-white hover:bg-[#705518] disabled:bg-gray-400 rounded-xl font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {scanLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Processing Diagnostics...</span>
                          </>
                        ) : (
                          <>
                            <MaterialIcon name="flash_on" className="text-base" />
                            <span>Analyze & Save Diagnostic</span>
                          </>
                        )}
                      </button>

                      {/* Diagnostic Result Alert */}
                      {scanDiagnosticResult && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl space-y-2">
                          <span className="block text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Diagnostic Complete</span>
                          <h5 className="font-serif font-bold text-sm">
                            Diagnosis: {scanDiagnosticResult.diagnosis || scanDiagnosticResult.diagnosis_result || (scanDiagnosticResult.tumor_found ? "Tumor Found" : "Elevated Risk")}
                          </h5>
                          {scanDiagnosticResult.aiExplanation && (
                            <p className="text-[11px] leading-relaxed text-emerald-950 font-normal">{scanDiagnosticResult.aiExplanation}</p>
                          )}
                        </div>
                      )}

                      {/* Error Alert */}
                      {scanError && (
                        <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-3 rounded-xl">
                          <p className="text-[11px] font-bold">{scanError}</p>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: MEDICAL REPORTS & PRESCRIPTIONS */}
              {activeTab === "reports" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                  
                  {/* Reports list */}
                  <div className="space-y-4">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18]">Prescriptions & Lab History</h4>
                    
                    {selectedPatient.reports.length === 0 ? (
                      <div className="p-8 border border-dashed border-[#E6E1D3] rounded-2xl text-center text-[#787363]">
                        <MaterialIcon name="description" className="text-3xl text-[#DCD5C5] mb-1" />
                        <p className="text-xs font-semibold">No medical reports registered yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedPatient.reports.map((report) => (
                          <div key={report.id} className="p-4 border border-[#E6E1D3] bg-white rounded-2xl space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-serif font-bold text-xs text-[#1C1B18]">{report.title}</span>
                              <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-[#EAF3FB] border border-[#C8DEF5] text-[#1C5396] uppercase">
                                {report.reportType}
                              </span>
                            </div>

                            {report.description && (
                              <p className="text-xs text-[#787363] leading-relaxed italic">"{report.description}"</p>
                            )}

                            {report.medicines && report.medicines.length > 0 && (
                              <div className="pt-2 border-t border-[#FAF6E8] flex flex-wrap gap-1">
                                {report.medicines.map((m, idx) => (
                                  <span key={idx} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100 rounded">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2 text-[9px] text-[#A8A28E] font-bold">
                              <span>Report Date: {report.reportDate || "N/A"}</span>
                              {report.fileUrl && (
                                <a
                                  href={report.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#8C6B1F] hover:underline flex items-center gap-0.5"
                                >
                                  <span>View Report file</span>
                                  <MaterialIcon name="open_in_new" className="text-[10px]" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form upload */}
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[24px] p-6 space-y-4">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18] flex items-center gap-1.5">
                      <MaterialIcon name="note_add" className="text-[#8C6B1F]" />
                      <span>Issue New Prescription / Report</span>
                    </h4>

                    <form onSubmit={handleUploadReport} className="space-y-3.5 text-xs font-semibold">
                      <div>
                        <label className="block text-[#787363] mb-1">Report Title</label>
                        <input
                          type="text"
                          value={reportForm.title}
                          onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          placeholder="e.g. Flu Treatment Plan"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[#787363] mb-1">Target Body Part (Anatomical Mapping)</label>
                        <select
                          value={reportForm.selectedPartStage}
                          onChange={(e) => setReportForm({ ...reportForm, selectedPartStage: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                        >
                          {BODY_PARTS.map((p) => (
                            <option key={p.stage} value={p.stage.toString()}>
                              {p.name} (Anatomy Stage {p.stage})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#787363] mb-1">Report Type</label>
                        <select
                          value={reportForm.reportType}
                          onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                        >
                          <option value="PRESCRIPTION">Prescription Notes</option>
                          <option value="LAB_RESULT">Laboratory Test Result</option>
                          <option value="DIAGNOSTIC_REPORT">General Diagnostic Report</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#787363] mb-1">Prescription Notes / Clinical Summary</label>
                        <textarea
                          rows={4}
                          value={reportForm.description}
                          onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white"
                          placeholder="Write instructions, medicines list, or diagnostic feedback..."
                        />
                      </div>

                      <div>
                        <label className="block text-[#787363] mb-1">Attach File (optional, PDF or Image)</label>
                        <input
                          type="file"
                          onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={reportLoading}
                        className="w-full py-3 bg-[#1C1B18] text-white hover:bg-[#32302A] disabled:bg-gray-400 rounded-xl font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {reportLoading ? "Saving Report..." : "Upload & Save Prescription"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 5: SECURE CLINICAL CHAT SHORTCUT */}
              {activeTab === "chat" && (
                <div className="py-12 max-w-md mx-auto text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#EAF3FB] border border-[#C8DEF5] text-[#1C5396] flex items-center justify-center mx-auto">
                    <MaterialIcon name="forum" className="text-2xl" />
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-bold text-[#1C1B18]">Secure Consultation channel</h4>
                    <p className="text-xs text-[#787363] mt-2 leading-relaxed">
                      Consult with {selectedPatient.fullName} on their biometrics telemetry, diagnostics, and prescriptions via our secure HIPAA-compliant instant messenger.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/chat?patientId=${selectedPatient.id}`)}
                    className="inline-flex w-full py-3 bg-[#1C5396] hover:bg-[#154175] text-white transition-colors rounded-xl text-xs font-bold uppercase tracking-wider items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <MaterialIcon name="forum" className="text-sm" />
                    <span>Open Consultation Window</span>
                  </button>
                </div>
              )}

              {/* TAB 6: TASKS & DIET */}
              {activeTab === "tasks-diet" && selectedPatient && (
                <div className="max-w-4xl space-y-6">

                  {/* Toast */}
                  {tdToast && (
                    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg text-white flex items-center gap-2 ${
                      tdToast.ok ? "bg-emerald-600" : "bg-red-600"
                    }`}>
                      <MaterialIcon name={tdToast.ok ? "check_circle" : "error"} className="text-sm" />
                      {tdToast.msg}
                    </div>
                  )}

                  {/* Sub-toggle: Tasks / Diet */}
                  <div className="flex items-center gap-3 border-b border-[#FAF6E8] pb-4">
                    <h4 className="font-serif text-base font-bold text-[#1C1B18] flex-1">Tasks & Diet Management</h4>
                    <div className="flex gap-1 bg-[#F6F4EF] rounded-xl p-1 border border-[#E6E1D3]">
                      <button
                        onClick={() => setTdDietView("tasks")}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                          tdDietView === "tasks" ? "bg-white shadow-sm text-[#1C1B18] border border-[#E6E1D3]" : "text-[#787363] hover:text-[#1C1B18]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><MaterialIcon name="task_alt" className="text-sm" />Tasks</span>
                      </button>
                      <button
                        onClick={() => setTdDietView("diet")}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                          tdDietView === "diet" ? "bg-white shadow-sm text-[#1C1B18] border border-[#E6E1D3]" : "text-[#787363] hover:text-[#1C1B18]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><MaterialIcon name="restaurant" className="text-sm" />Diet Plan</span>
                      </button>
                    </div>
                  </div>

                  {tdLoading && (
                    <div className="flex items-center justify-center py-12">
                      <svg className="animate-spin h-6 w-6 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}

                  {/* ─── TASKS VIEW ─── */}
                  {!tdLoading && tdDietView === "tasks" && (
                    <div className="space-y-5">


                      {/* Add Task Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => setTdShowTaskForm((v) => !v)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#1C1B18] hover:bg-[#2A2925] text-white text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <MaterialIcon name={tdShowTaskForm ? "close" : "add"} className="text-sm" />
                          {tdShowTaskForm ? "Cancel" : "Add Task"}
                        </button>
                      </div>

                      {/* Create Task Form */}
                      {tdShowTaskForm && (
                        <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-5 space-y-4 shadow-xs">
                          <h5 className="text-xs font-bold text-[#1C1B18] uppercase tracking-wide">New Task</h5>

                          {/* Task Type Toggle */}
                          <div className="flex gap-2">
                            {(["task_based", "goal_based"] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setTdTaskForm((f) => ({ ...f, taskType: type }))}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                                  tdTaskForm.taskType === type
                                    ? "bg-[#1C1B18] text-white border-[#1C1B18]"
                                    : "bg-white text-[#787363] border-[#E6E1D3] hover:border-[#1C1B18]"
                                }`}
                              >
                                {type === "task_based" ? "📋 Task Based" : "🎯 Goal Based"}
                              </button>
                            ))}
                          </div>

                          {/* Task Based Fields */}
                          {tdTaskForm.taskType === "task_based" && (
                            <input
                              className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                              placeholder="Task name (e.g. Take morning medication)"
                              value={tdTaskForm.taskName}
                              onChange={(e) => setTdTaskForm((f) => ({ ...f, taskName: e.target.value }))}
                            />
                          )}

                          {/* Goal Based Fields */}
                          {tdTaskForm.taskType === "goal_based" && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-[#787363] uppercase block mb-1">Metric</label>
                                <select
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F] cursor-pointer"
                                  value={tdTaskForm.goalMetric}
                                  onChange={(e) => setTdTaskForm((f) => ({ ...f, goalMetric: e.target.value as any }))}
                                >
                                  <option value="daily_steps">Daily Steps</option>
                                  <option value="calories_burn">Calories Burn</option>
                                  <option value="min_sleep">Min Sleep (mins)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-[#787363] uppercase block mb-1">Target</label>
                                <input
                                  type="number" min="1"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  placeholder="e.g. 10000"
                                  value={tdTaskForm.goalTarget}
                                  onChange={(e) => setTdTaskForm((f) => ({ ...f, goalTarget: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-[#787363] uppercase block mb-1">Every N days</label>
                                <input
                                  type="number" min="1"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  placeholder="1 = daily"
                                  value={tdTaskForm.freqIntervalDays}
                                  onChange={(e) => setTdTaskForm((f) => ({ ...f, freqIntervalDays: e.target.value }))}
                                />
                              </div>
                            </div>
                          )}

                          <textarea
                            className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F] resize-none"
                            rows={2}
                            placeholder="Description (optional)"
                            value={tdTaskForm.taskDescription}
                            onChange={(e) => setTdTaskForm((f) => ({ ...f, taskDescription: e.target.value }))}
                          />

                          <button
                            disabled={tdActionLoading}
                            onClick={() => handleCreateTask(selectedPatient.id)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer"
                          >
                            {tdActionLoading ? "Creating..." : "Create Task"}
                          </button>
                        </div>
                      )}

                      {/* Task List */}
                      {tdTasks.length === 0 && !tdShowTaskForm && (
                        <div className="text-center py-12 text-[#787363]">
                          <MaterialIcon name="task_alt" className="text-4xl opacity-30 block mb-2" />
                          <p className="text-xs font-medium">No tasks assigned yet. Add a task above.</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {tdTasks.map((task) => {
                          const isGoal = task.taskType === "goal_based";
                          const isExpanded = tdExpandedTask === task.id;
                          const metricLabel = task.goalMetric === "daily_steps" ? "Steps" : task.goalMetric === "calories_burn" ? "Calories" : "Sleep (min)";
                          return (
                            <div key={task.id} className={`border rounded-2xl overflow-hidden transition-all ${
                              task.isActive ? "border-[#E6E1D3] bg-white" : "border-dashed border-[#E6E1D3] bg-[#F6F4EF] opacity-60"
                            }`}>
                              <div className="flex items-center gap-3 p-4">
                                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                                  isGoal ? "bg-violet-50 border border-violet-200" : "bg-emerald-50 border border-emerald-200"
                                }`}>
                                  <MaterialIcon name={isGoal ? "track_changes" : "check_box"} className={`text-sm ${isGoal ? "text-violet-600" : "text-emerald-600"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#1C1B18] truncate">
                                      {isGoal ? `${metricLabel} ≥ ${task.goalTarget}` : task.taskName}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                      isGoal ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
                                    }`}>
                                      {isGoal ? `Every ${task.freqIntervalDays}d` : "Manual"}
                                    </span>
                                    {!task.isActive && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Removed</span>}
                                  </div>
                                  {task.taskDescription && (
                                    <p className="text-[10px] text-[#787363] mt-0.5 truncate">{task.taskDescription}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const next = isExpanded ? null : task.id;
                                      setTdExpandedTask(next);
                                      if (next) fetchTaskHistory(next);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-[#F6F4EF] text-[#787363] hover:text-[#1C1B18] transition-all cursor-pointer"
                                    title="View history"
                                  >
                                    <MaterialIcon name="history" className="text-sm" />
                                  </button>
                                  {task.isActive && (
                                    <button
                                      onClick={() => handleDeactivateTask(task.id, selectedPatient.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#787363] hover:text-red-600 transition-all cursor-pointer"
                                      title="Remove task"
                                    >
                                      <MaterialIcon name="delete" className="text-sm" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* History Drawer */}
                              {isExpanded && (
                                <div className="border-t border-[#F6F4EF] px-4 py-3 bg-[#FAF9F5]">
                                  <p className="text-[9px] font-bold uppercase text-[#787363] mb-2">Completion History</p>
                                  {!tdTaskHistories[task.id] ? (
                                    <p className="text-xs text-[#787363]">Loading...</p>
                                  ) : tdTaskHistories[task.id].length === 0 ? (
                                    <p className="text-xs text-[#787363]">No history yet. History is generated on metric sync.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {tdTaskHistories[task.id].slice(0, 20).map((h: any) => (
                                        <div key={h.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border ${
                                          h.isDone ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-100 text-red-600"
                                        }`}>
                                          <MaterialIcon name={h.isDone ? "check" : "close"} className="text-xs" />
                                          {h.periodDate}
                                          {h.actualValue && <span className="ml-1 opacity-70">{h.actualValue}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ─── DIET VIEW ─── */}
                  {!tdLoading && tdDietView === "diet" && (
                    <div className="space-y-5">

                      {/* Assign Diet Plan Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => setTdShowDietForm((v) => !v)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#1C1B18] hover:bg-[#2A2925] text-white text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <MaterialIcon name={tdShowDietForm ? "close" : "add"} className="text-sm" />
                          {tdShowDietForm ? "Cancel" : "Assign Diet Plan"}
                        </button>
                      </div>

                      {/* Manual Diet Plan Form */}
                      {tdShowDietForm && (
                        <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-5 space-y-4 shadow-xs text-xs font-semibold">
                          <h5 className="text-xs font-bold text-[#1C1B18] uppercase tracking-wide">Assign Diet Plan</h5>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[#787363] mb-1">Plan Title</label>
                              <input
                                className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                placeholder="e.g. Low Sodium Diet"
                                value={tdDietForm.title}
                                onChange={(e) => setTdDietForm((f) => ({ ...f, title: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[#787363] mb-1">Start Date</label>
                              <input
                                type="date"
                                className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                value={tdDietForm.startDate}
                                onChange={(e) => setTdDietForm((f) => ({ ...f, startDate: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[#787363] mb-1">End Date (optional)</label>
                              <input
                                type="date"
                                className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                value={tdDietForm.endDate}
                                onChange={(e) => setTdDietForm((f) => ({ ...f, endDate: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="border-t border-[#FAF6E8] pt-3">
                            <p className="text-[10px] font-bold uppercase text-[#8C6B1F] mb-2">Meal Schedule (Comma separated)</p>
                            <div className="space-y-3">
                              <div className="grid grid-cols-4 gap-2 items-center">
                                <span className="text-[10px] font-bold text-[#787363] uppercase">Breakfast</span>
                                <input
                                  className="col-span-2 border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  placeholder="Oats, Apple, Milk"
                                  value={tdDietForm.breakfastMeals}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, breakfastMeals: e.target.value }))}
                                />
                                <input
                                  type="time"
                                  className="border border-[#E6E1D3] rounded-xl px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  value={tdDietForm.breakfastTime}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, breakfastTime: e.target.value }))}
                                />
                              </div>

                              <div className="grid grid-cols-4 gap-2 items-center">
                                <span className="text-[10px] font-bold text-[#787363] uppercase">Lunch</span>
                                <input
                                  className="col-span-2 border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  placeholder="Brown Rice, Grilled Chicken, Broccoli"
                                  value={tdDietForm.lunchMeals}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, lunchMeals: e.target.value }))}
                                />
                                <input
                                  type="time"
                                  className="border border-[#E6E1D3] rounded-xl px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  value={tdDietForm.lunchTime}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, lunchTime: e.target.value }))}
                                />
                              </div>

                              <div className="grid grid-cols-4 gap-2 items-center">
                                <span className="text-[10px] font-bold text-[#787363] uppercase">Dinner</span>
                                <input
                                  className="col-span-2 border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  placeholder="Salmon, Asparagus, Quinoa"
                                  value={tdDietForm.dinnerMeals}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, dinnerMeals: e.target.value }))}
                                />
                                <input
                                  type="time"
                                  className="border border-[#E6E1D3] rounded-xl px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  value={tdDietForm.dinnerTime}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, dinnerTime: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[#FAF6E8] pt-3">
                            <p className="text-[10px] font-bold uppercase text-[#8C6B1F] mb-2">Nutritional Targets & Goals</p>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              <div>
                                <label className="block text-[9px] text-[#787363] uppercase mb-1">Calories (kcal)</label>
                                <input
                                  type="number"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                  value={tdDietForm.dailyCalories}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, dailyCalories: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[#787363] uppercase mb-1">Protein (g)</label>
                                <input
                                  type="number"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                  value={tdDietForm.proteinG}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, proteinG: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[#787363] uppercase mb-1">Carbs (g)</label>
                                <input
                                  type="number"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                  value={tdDietForm.carbsG}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, carbsG: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[#787363] uppercase mb-1">Fat (g)</label>
                                <input
                                  type="number"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                  value={tdDietForm.fatG}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, fatG: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[#787363] uppercase mb-1">Water (ml)</label>
                                <input
                                  type="number"
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                  value={tdDietForm.waterMl}
                                  onChange={(e) => setTdDietForm((f) => ({ ...f, waterMl: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="block text-[9px] text-[#787363] uppercase mb-1">Health Goals (Comma separated)</label>
                              <input
                                className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                                placeholder="e.g. Kidney Recovery, Low Oxalate"
                                value={tdDietForm.healthGoals}
                                onChange={(e) => setTdDietForm((f) => ({ ...f, healthGoals: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] text-[#787363] uppercase mb-1">Doctor Notes</label>
                            <textarea
                              className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none resize-none"
                              rows={2}
                              placeholder="Any special remarks or suggestions..."
                              value={tdDietForm.doctorNotes}
                              onChange={(e) => setTdDietForm((f) => ({ ...f, doctorNotes: e.target.value }))}
                            />
                          </div>

                          <button
                            disabled={tdActionLoading}
                            onClick={() => handleCreateDiet(selectedPatient.id)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer"
                          >
                            {tdActionLoading ? "Assigning..." : "Assign Diet Plan"}
                          </button>
                        </div>
                      )}

                      {/* Diet Plans List */}
                      {tdDietPlans.length === 0 && !tdShowDietForm && (
                        <div className="text-center py-10 text-[#787363]">
                          <MaterialIcon name="restaurant" className="text-4xl opacity-30 block mb-2" />
                          <p className="text-xs font-medium">No diet plans yet. Assign one manually above.</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        {tdDietPlans.map((plan) => (
                          <div key={plan.id} className="border border-[#E6E1D3] bg-white rounded-3xl overflow-hidden">
                            <div className="flex items-start justify-between p-4 border-b border-[#F6F4EF]">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#1C1B18]">{plan.title || "Diet Plan"}</span>
                                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    plan.status === "AI_GENERATED" ? "bg-amber-100 text-amber-700" :
                                    plan.status === "DOCTOR_VERIFIED" ? "bg-emerald-100 text-emerald-700" :
                                    plan.status === "ACTIVE" ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>
                                    {plan.status?.replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-[9px] text-[#787363] mt-0.5">{new Date(plan.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setTdEditDiet(tdEditDiet?.id === plan.id ? null : { ...plan })}
                                  className="p-1.5 rounded-lg hover:bg-[#FAF6E8] text-[#8C6B1F] transition-all cursor-pointer" title="Edit"
                                >
                                  <MaterialIcon name="edit" className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDiet(plan.id, selectedPatient.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-[#787363] hover:text-red-600 transition-all cursor-pointer" title="Delete"
                                >
                                  <MaterialIcon name="delete" className="text-sm" />
                                </button>
                              </div>
                            </div>

                            {/* Nutritional Targets */}
                            {plan.nutritionalTargets && (
                              <div className="px-4 py-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {Object.entries(plan.nutritionalTargets).map(([k, v]: any) => (
                                  <div key={k} className="text-center">
                                    <p className="text-[9px] font-bold text-[#787363] uppercase">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                                    <p className="text-xs font-bold text-[#1C1B18]">{v}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* AI Rationale */}
                            {plan.aiRationale && (
                              <div className="px-4 pb-3">
                                <p className="text-[9px] font-bold text-[#787363] uppercase mb-1">AI Rationale</p>
                                <p className="text-[10px] text-[#1C1B18] leading-relaxed">{plan.aiRationale}</p>
                              </div>
                            )}

                            {/* Daily Schedule */}
                            {plan.dailySchedule && (
                              <div className="px-4 pb-4">
                                <p className="text-[9px] font-bold text-[#787363] uppercase mb-2">Daily Schedule</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {Object.entries(plan.dailySchedule).map(([meal, info]: any) => (
                                    <div key={meal} className="bg-[#FAF9F5] border border-[#F0EDE4] rounded-xl px-3 py-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-bold uppercase text-[#8C6B1F]">{meal.replace(/([A-Z])/g, " $1").trim()}</span>
                                        {info.time && <span className="text-[8px] text-[#787363]">{info.time}</span>}
                                      </div>
                                      <p className="text-[10px] text-[#1C1B18]">{Array.isArray(info.meals) ? info.meals.join(", ") : info.meals}</p>
                                      {info.notes && <p className="text-[9px] text-[#787363] mt-0.5 italic">{info.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Edit inline */}
                            {tdEditDiet?.id === plan.id && (
                              <div className="border-t border-[#FAF6E8] px-4 py-4 bg-[#FAF9F5] space-y-3">
                                <p className="text-[9px] font-bold uppercase text-[#787363]">Edit Plan</p>
                                <input
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F]"
                                  placeholder="Plan title"
                                  value={tdEditDiet.title || ""}
                                  onChange={(e) => setTdEditDiet((p: any) => ({ ...p, title: e.target.value }))}
                                />
                                <textarea
                                  className="w-full border border-[#E6E1D3] rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#8C6B1F] resize-none"
                                  rows={3}
                                  placeholder="Doctor notes..."
                                  value={tdEditDiet.doctorNotes || ""}
                                  onChange={(e) => setTdEditDiet((p: any) => ({ ...p, doctorNotes: e.target.value }))}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveDiet(selectedPatient.id)}
                                    disabled={tdActionLoading}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer transition-all"
                                  >
                                    {tdActionLoading ? "Saving..." : "Save Changes"}
                                  </button>
                                  <button
                                    onClick={() => setTdEditDiet(null)}
                                    className="px-4 py-2 border border-[#E6E1D3] text-[#787363] text-[10px] font-bold uppercase rounded-xl cursor-pointer hover:border-[#1C1B18] transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : (
          // WORKSPACE 2: CLINICAL WORKSTATION HOME OVERVIEW
          <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-between custom-scrollbar bg-[#FAF9F5]/20">
            
            {/* Header Greetings & Stats */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#1C1B18] via-[#2A2925] to-[#1C1B18] text-[#FAF9F5] border border-[#3E3A32] p-8 rounded-[36px] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">Welcome to your Clinical Workspace</h2>
                  <p className="text-xs text-[#FAF6E8]/70 mt-1.5 font-medium">
                    EHR Portal — Manage patient directory records, biometrics tracking, disease scans, and consultations.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-[#FAF6E8] opacity-80 uppercase">Clinical Core: Active</span>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E6E1D3] p-5 rounded-3xl hover:shadow-xs transition-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold tracking-wide text-[#787363] uppercase">Managed Patients</span>
                    <div className="w-8 h-8 rounded-lg bg-[#EAF3FB] border border-[#C8DEF5] flex items-center justify-center">
                      <MaterialIcon name="groups" className="text-[#1C5396] text-md" />
                    </div>
                  </div>
                  <p className="font-serif text-2xl font-bold tracking-tight mt-3">{totalPatients}</p>
                  <p className="text-[8px] font-bold mt-1 text-[#787363] uppercase">{myPatientsCount} Assigned to you</p>
                </div>

                <div className="bg-white border border-[#E6E1D3] p-5 rounded-3xl hover:shadow-xs transition-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold tracking-wide text-[#787363] uppercase">Scans Run</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <MaterialIcon name="biotech" className="text-amber-600 text-md" />
                    </div>
                  </div>
                  <p className="font-serif text-2xl font-bold tracking-tight mt-3">{totalScans}</p>
                  <p className="text-[8px] font-bold mt-1 text-emerald-600 uppercase">AI Diagnosis Enabled</p>
                </div>

                <div className="bg-white border border-[#E6E1D3] p-5 rounded-3xl hover:shadow-xs transition-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold tracking-wide text-[#787363] uppercase">Reports Logged</span>
                    <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] border border-[#FAF6E8] flex items-center justify-center">
                      <MaterialIcon name="description" className="text-[#8C6B1F] text-md" />
                    </div>
                  </div>
                  <p className="font-serif text-2xl font-bold tracking-tight mt-3">{totalReports}</p>
                  <p className="text-[8px] font-bold mt-1 text-[#787363] uppercase">Rx & Lab records</p>
                </div>

                <div className="bg-white border border-[#E6E1D3] p-5 rounded-3xl hover:shadow-xs transition-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold tracking-wide text-[#787363] uppercase">EHR Health</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <MaterialIcon name="favorite" className="text-emerald-600 text-md" />
                    </div>
                  </div>
                  <p className="font-serif text-2xl font-bold tracking-tight mt-3">100%</p>
                  <p className="text-[8px] font-bold mt-1 text-emerald-600 uppercase">Sync Status: Good</p>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-center text-[#A8A28E] font-bold tracking-wider uppercase pt-8">
              HIPAA Compliant Clinician Workspace • Hippo AI Health
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

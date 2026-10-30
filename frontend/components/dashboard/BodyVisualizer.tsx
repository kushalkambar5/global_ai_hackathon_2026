"use client";

import React, { useState, useEffect, useRef } from "react";

interface LayerPosition {
  top: string;
  left: string;
  width: string;
  transform: string;
  height?: string;
}

interface DetailedStage {
  stage: number;
  id: string;
  name: string;
  file: string;
  type: "full-body" | "organ";
  zIndex: number;
  color: string;
  emoji: string;
  description: string;
  position?: LayerPosition;
  positions?: LayerPosition[];
}

interface KeyFrameStage {
  stage: number;
  name: string;
  color: string;
  emoji: string;
  description: string;
  layers: string[];
}

const DETAILED_STAGES: DetailedStage[] = [
  {
    stage: 1,
    id: "skeleton",
    name: "Skeleton Structure",
    file: "/human_body_parts/human_skeleton.png",
    type: "full-body",
    zIndex: 1,
    color: "#38bdf8",
    emoji: "🦴",
    description: "Group 1: Completely isolated full skeleton view.",
  },
  {
    stage: 2,
    id: "circulatory",
    name: "Circulatory System",
    file: "/human_body_parts/human_circulatory_system.png",
    type: "full-body",
    zIndex: 2,
    color: "#ef4444",
    emoji: "🩸",
    description: "Group 2: Completely isolated circulatory system view.",
  },
  {
    stage: 3,
    id: "urinary",
    name: "Urinary System",
    file: "/human_body_parts/human_urinary_system.png",
    type: "organ",
    zIndex: 3,
    color: "#f97316",
    emoji: "🫘",
    position: { top: "38%", left: "50%", width: "28%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Start of organ group accumulation (Stage 3).",
  },
  {
    stage: 4,
    id: "digestive",
    name: "Digestive System",
    file: "/human_body_parts/human_digestive_system.png",
    type: "organ",
    zIndex: 4,
    color: "#f59e0b",
    emoji: "🫄",
    position: { top: "27%", left: "50%", width: "30%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Accumulating organ group members (Stage 3-4).",
  },
  {
    stage: 5,
    id: "gallbladder",
    name: "Gallbladder",
    file: "/human_body_parts/human_Gallbladder.png",
    type: "organ",
    zIndex: 5,
    color: "#84cc16",
    emoji: "🟢",
    position: { top: "34%", left: "42%", width: "10%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Accumulating organ group members (Stage 3-5).",
  },
  {
    stage: 6,
    id: "liver",
    name: "Liver",
    file: "/human_body_parts/human_liver.png",
    type: "organ",
    zIndex: 6,
    color: "#dc2626",
    emoji: "🫁",
    position: { top: "30%", left: "49%", width: "20%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Accumulating organ group members (Stage 3-6).",
  },
  {
    stage: 7,
    id: "diaphragm",
    name: "Diaphragm",
    file: "/human_body_parts/human_diafragma.png",
    type: "organ",
    zIndex: 7,
    color: "#a855f7",
    emoji: "🫧",
    position: { top: "30%", left: "50%", width: "28%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Accumulating organ group members (Stage 3-7).",
  },
  {
    stage: 8,
    id: "heart",
    name: "Heart",
    file: "/human_body_parts/human_heart.png",
    type: "organ",
    zIndex: 8,
    color: "#e11d48",
    emoji: "❤️",
    position: { top: "22%", left: "51%", width: "14%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Accumulating organ group members (Stage 3-8).",
  },
  {
    stage: 9,
    id: "lungs",
    name: "Lungs",
    file: "/human_body_parts/human_lungs.png",
    type: "organ",
    zIndex: 9,
    color: "#fb7185",
    emoji: "🫁",
    position: { top: "18.5%", left: "50%", width: "50%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs): Complete set of internal organs (Stage 3-9).",
  },
  {
    stage: 10,
    id: "brain",
    name: "Brain",
    file: "/human_body_parts/human_brain.png",
    type: "organ",
    zIndex: 10,
    color: "#ec4899",
    emoji: "🧠",
    position: { top: "4.2%", left: "50%", width: "16%", transform: "translateX(-50%)" },
    description: "Group 3 (Internal Organs & Head): Accumulating organ & brain group members (Stage 3-10).",
  },
  {
    stage: 11,
    id: "eyes",
    name: "Eyes",
    file: "/human_body_parts/human_eye.png",
    type: "organ",
    zIndex: 11,
    color: "#06b6d4",
    emoji: "👁️",
    positions: [
      { top: "12%", left: "46.8%", width: "4.5%", transform: "translateX(-50%)" },
      { top: "12%", left: "53.2%", width: "4.5%", transform: "translateX(-50%)" },
    ],
    description: "Group 3 (Internal Organs & Head): Complete set of organs, brain, and eyes (Stage 3-11).",
  },
  {
    stage: 12,
    id: "muscles",
    name: "Muscular System",
    file: "/human_body_parts/human_muscles_body.png",
    type: "full-body",
    zIndex: 12,
    color: "#ea580c",
    emoji: "💪",
    description: "Group 4: Completely isolated muscular system view.",
  },
  {
    stage: 13,
    id: "skin",
    name: "Full Body (Skin)",
    file: "/human_body_parts/human_skin_body.png",
    type: "full-body",
    zIndex: 13,
    color: "#f59e0b",
    emoji: "🧑",
    description: "Group 5 (Stage 13): Completely isolated full body skin cover.",
  },
];

const KEYFRAME_STAGES: KeyFrameStage[] = [
  {
    stage: 1,
    name: "Frame 1: Bone Structure",
    color: "#38bdf8",
    emoji: "🦴",
    description: "Isolated view of the skeletal system without muscles or skin.",
    layers: ["skeleton"],
  },
  {
    stage: 2,
    name: "Frame 2: Circulatory System",
    color: "#ef4444",
    emoji: "🩸",
    description: "Isolated view of the circulatory blood vessel & neural pathway network.",
    layers: ["circulatory"],
  },
  {
    stage: 3,
    name: "Frame 3: Internal Organs",
    color: "#e11d48",
    emoji: "🫀",
    description: "Isolated view of major internal organs (Heart, Lungs, Brain, Eyes, Digestive, Liver, Urinary, Diaphragm).",
    layers: ["brain", "eyes", "lungs", "heart", "liver", "gallbladder", "digestive", "urinary", "diaphragm"],
  },
  {
    stage: 4,
    name: "Frame 4: Muscular System",
    color: "#ea580c",
    emoji: "💪",
    description: "Isolated view of the muscular system responsible for movement.",
    layers: ["muscles"],
  },
  {
    stage: 5,
    name: "Frame 5: Full Body",
    color: "#f59e0b",
    emoji: "🧑",
    description: "Isolated view of the complete human body skin surface.",
    layers: ["skin"],
  },
];

const INTERNAL_ORGANS_LIST = [
  { id: "brain", name: "Brain", emoji: "🧠" },
  { id: "eyes", name: "Eyes", emoji: "👁️" },
  { id: "lungs", name: "Lungs", emoji: "🫁" },
  { id: "heart", name: "Heart", emoji: "❤️" },
  { id: "diaphragm", name: "Diaphragm", emoji: "🫧" },
  { id: "liver", name: "Liver", emoji: "🫁" },
  { id: "gallbladder", name: "Gallbladder", emoji: "🟢" },
  { id: "digestive", name: "Digestive System", emoji: "🫄" },
  { id: "urinary", name: "Urinary System", emoji: "🫘" },
];


// ── Types for right panel ────────────────────────────────────────────────────

interface DiseaseScan {
  id: string;
  scanType: string;
  predictionResult: any;
  status: string;
  aiExplanation: string | null;
  affectedParts: number[] | null;
  medicines: string[] | null;
  createdAt: string;
}

interface MedicalReport {
  id: string;
  title: string;
  description: string | null;
  reportType: string | null;
  fileUrl: string | null;
  aiSummary: any;
  medicines: string[] | null;
  affectedParts?: number[] | null;
  uploadedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function partMatches(partName: string, query: string): boolean {
  return query.toLowerCase().includes(partName.toLowerCase()) ||
    partName.toLowerCase().includes(query.toLowerCase());
}

function scanMatchesPart(scan: DiseaseScan, partId: string, partName: string): boolean {
  const selectedStageObj = DETAILED_STAGES.find((s) => s.id === partId);
  const selectedPartStage = selectedStageObj?.stage;
  if (selectedPartStage && scan.affectedParts && scan.affectedParts.includes(selectedPartStage)) {
    return true;
  }
  if (!scan.affectedParts || scan.affectedParts.length === 0) {
    // Fallback: match by scan type keywords
    const st = scan.scanType.toLowerCase();
    const pid = partId.toLowerCase();
    if (pid === "heart" && (st.includes("heart") || st.includes("ecg"))) return true;
    if (pid === "brain" && st.includes("brain")) return true;
    if (pid === "lungs" && (st.includes("chest") || st.includes("lung"))) return true;
    if (pid === "skeleton" && st.includes("bone")) return true;
    if (pid === "skin" && st.includes("skin")) return true;
    return false;
  }
  return false;
}

function reportMatchesPart(report: MedicalReport, partId: string, partName: string, selectedPartStage?: number): boolean {
  if (selectedPartStage && Array.isArray(report.affectedParts) && report.affectedParts.includes(selectedPartStage)) {
    return true;
  }
  const haystack = `${report.title} ${report.description || ""}`.toLowerCase();
  const pid = partId.toLowerCase();
  
  // Custom fallbacks for common synonyms/keywords when affectedParts array is not present or doesn't match directly
  if (pid === "skeleton") {
    if (haystack.includes("bone") || haystack.includes("skeleton") || haystack.includes("fracture") || haystack.includes("osteoporosis") || haystack.includes("spine")) {
      return true;
    }
  }
  if (pid === "heart") {
    if (haystack.includes("heart") || haystack.includes("cardiac") || haystack.includes("ecg") || haystack.includes("cardio")) {
      return true;
    }
  }
  if (pid === "lungs") {
    if (haystack.includes("chest") || haystack.includes("lung") || haystack.includes("pulmonary") || haystack.includes("pneumonia") || haystack.includes("respiratory")) {
      return true;
    }
  }
  if (pid === "brain") {
    if (haystack.includes("brain") || haystack.includes("cranial") || haystack.includes("headache") || haystack.includes("migraine")) {
      return true;
    }
  }
  if (pid === "circulatory") {
    if (haystack.includes("blood") || haystack.includes("vein") || haystack.includes("artery") || haystack.includes("vascular") || haystack.includes("cardiovascular")) {
      return true;
    }
  }
  if (pid === "muscles") {
    if (haystack.includes("muscle") || haystack.includes("sprain") || haystack.includes("tendon") || haystack.includes("myo")) {
      return true;
    }
  }
  if (pid === "skin") {
    if (haystack.includes("skin") || haystack.includes("dermatology") || haystack.includes("rash") || haystack.includes("cut") || haystack.includes("bruise")) {
      return true;
    }
  }

  return haystack.includes(pid) || haystack.includes(partName.toLowerCase());
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Right panel sub-components ───────────────────────────────────────────────────────

function PartTimelinePanel({
  selectedPartId,
  selectedPartName,
  selectedPartEmoji,
  scans,
  reports,
  loading,
  showAll = false,
  allTitle = "All Medical Reports",
}: {
  selectedPartId: string | null;
  selectedPartName: string;
  selectedPartEmoji: string;
  scans: DiseaseScan[];
  reports: MedicalReport[];
  loading: boolean;
  showAll?: boolean;
  allTitle?: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // When no specific part is selected and showAll is false, do not show any reports
  const isShowingAll = showAll;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <svg className="animate-spin h-6 w-6 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-[10px] text-[#787363] font-sans">Loading records...</span>
      </div>
    );
  }

  const selectedStageObj = DETAILED_STAGES.find((s) => s.id === selectedPartId);
  const selectedPartStage = selectedStageObj?.stage;
  const matchedScans = isShowingAll
    ? scans
    : selectedPartId
    ? scans.filter((s) => scanMatchesPart(s, selectedPartId, selectedPartName))
    : [];
  const matchedReports = isShowingAll
    ? reports
    : selectedPartId
    ? reports.filter((r) => reportMatchesPart(r, selectedPartId, selectedPartName, selectedPartStage))
    : [];
  const totalCount = matchedScans.length + matchedReports.length;

  return (
    <div className="space-y-3 overflow-y-auto pr-1 flex-1" style={{ maxHeight: "320px" }}>
      {/* Hint banner when no specific organ is selected */}
      {!selectedPartId && !showAll && (
        <div className="flex items-center gap-2 bg-[#FAF6E8] border border-[#E6D89A] rounded-xl px-3 py-2 mb-1">
          <span className="text-sm">👆</span>
          <p className="text-[9px] text-[#8C6B1F] font-sans leading-relaxed">
            Click any organ on the body to filter records for that part.
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 sticky top-0 bg-[#FAF9F5] pb-2 z-10">
        <span className="text-lg">{isShowingAll ? "📋" : (selectedPartEmoji || "🩺")}</span>
        <div>
          <p className="font-serif text-sm font-bold text-[#1C1B18] leading-tight">
            {isShowingAll ? (allTitle || "All Medical Reports") : (selectedPartName || "No Organ Selected")}
          </p>
          <p className="text-[9px] text-[#787363] font-sans">{totalCount} related record{totalCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {totalCount === 0 && (
        <div className="text-center py-6">
          <span className="material-symbols-outlined text-3xl text-[#DCD5C5]">folder_off</span>
          <p className="text-xs text-[#787363] font-sans mt-1">
            {selectedPartId ? `No records for ${selectedPartName}` : "Select an organ to view reports"}
          </p>
        </div>
      )}

      {matchedScans.map((scan) => {
        const diag = scan.predictionResult?.diagnosis || scan.predictionResult?.diagnosis_result ||
          (scan.predictionResult?.tumor_found ? "Tumor Detected" : null) ||
          scan.scanType.replace(/_/g, " ");
        const isOpen = expandedIds.has(scan.id);
        return (
          <div
            key={scan.id}
            className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden transition-all"
          >
            {/* Clickable header row */}
            <button
              onClick={() => toggleExpand(scan.id)}
              className="w-full flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-purple-100/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[8px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded font-sans shrink-0">
                  AI Scan · {scan.scanType.replace(/_/g, " ")}
                </span>
                <span className="font-serif text-xs font-bold text-[#1C1B18] truncate">{diag}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${scan.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {scan.status}
                </span>
                <span className="material-symbols-outlined text-purple-500 transition-transform duration-200" style={{ fontSize: "14px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                  expand_more
                </span>
              </div>
            </button>

            {/* Expandable details */}
            {isOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-purple-200">
                <p className="text-[9px] text-[#787363] font-sans pt-2">{fmtDate(scan.createdAt)}</p>
                {scan.aiExplanation && (
                  <p className="text-[9px] text-[#4D493E] font-sans leading-relaxed">{scan.aiExplanation}</p>
                )}
                {scan.medicines && scan.medicines.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {scan.medicines.map((m, i) => (
                      <span key={i} className="text-[8px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full font-sans font-semibold">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {matchedReports.map((report) => {
        const isOpen = expandedIds.has(report.id);
        return (
          <div
            key={report.id}
            className="bg-sky-50 border border-sky-200 rounded-xl overflow-hidden transition-all"
          >
            {/* Clickable header row */}
            <button
              onClick={() => toggleExpand(report.id)}
              className="w-full flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-sky-100/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[8px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100 border border-sky-200 px-1.5 py-0.5 rounded font-sans shrink-0">
                  {report.reportType || "OTHER"}
                </span>
                <span className="font-serif text-xs font-bold text-[#1C1B18] truncate">{report.title}</span>
              </div>
              <span className="material-symbols-outlined text-sky-400 transition-transform duration-200 shrink-0" style={{ fontSize: "14px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                expand_more
              </span>
            </button>

            {/* Expandable details */}
            {isOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-sky-200">
                <p className="text-[9px] text-[#787363] font-sans pt-2">{fmtDate(report.uploadedAt)}</p>
                {report.description && (
                  <p className="text-[9px] text-[#4D493E] font-sans leading-relaxed">{report.description}</p>
                )}
                {report.medicines && report.medicines.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {report.medicines.map((m, i) => (
                      <span key={i} className="text-[8px] bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded-full font-sans font-semibold">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportNewProblemForm({ onSuccess, selectedPart }: { onSuccess: () => void; selectedPart: DetailedStage | null }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState("OTHER");
  const [reportDate, setReportDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg("Title is required."); return; }
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("reportType", reportType);
      if (reportDate) fd.append("reportDate", reportDate);
      if (file) fd.append("file", file);
      if (selectedPart) {
        fd.append("selectedPartId", selectedPart.id);
        fd.append("selectedPartName", selectedPart.name);
        fd.append("selectedPartStage", String(selectedPart.stage));
      }
      fd.append("fromVisualizeBody", "true");

      const resp = await fetch("/api/medical-reports", { method: "POST", body: fd });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.message || "Failed to submit report.");
      }
      setSuccessMsg("Problem reported successfully!");
      setTitle(""); setDescription(""); setReportType("OTHER"); setReportDate(""); setFile(null); setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Title */}
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#4D493E] mb-1 font-sans">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chest pain since Monday"
          className="w-full px-3 py-2 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] text-xs font-sans"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#4D493E] mb-1 font-sans">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your symptoms or condition..."
          rows={3}
          className="w-full px-3 py-2 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] text-xs font-sans resize-none"
        />
      </div>

      {/* Report Type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-[#4D493E] mb-1 font-sans">Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-2.5 py-2 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/30 text-xs font-sans cursor-pointer"
          >
            {["LAB", "IMAGING", "PRESCRIPTION", "DISCHARGE", "OTHER"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-[#4D493E] mb-1 font-sans">Date</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full px-2.5 py-2 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/30 text-xs font-sans"
          />
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#4D493E] mb-1 font-sans">
          Attach File <span className="text-[#A8A28E] normal-case font-normal">(optional)</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#DCD5C5] rounded-xl p-3 text-center cursor-pointer hover:border-[#8C6B1F] hover:bg-[#FAF6E8]/50 transition-all"
        >
          {filePreview ? (
            <img src={filePreview} alt="preview" className="mx-auto max-h-24 object-contain rounded-lg" />
          ) : file ? (
            <div className="flex items-center justify-center gap-2 text-xs text-[#4D493E] font-sans">
              <span className="material-symbols-outlined text-sm text-[#8C6B1F]">attach_file</span>
              <span className="truncate max-w-[140px]">{file.name}</span>
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl text-[#A8A28E]">cloud_upload</span>
              <p className="text-[9px] text-[#787363] font-sans mt-1">Click to upload image or PDF</p>
            </>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
        </div>
        {file?.type.startsWith("image/") && (
          <p className="text-[9px] text-[#8C6B1F] font-sans mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
            AI will generate a summary from this image
          </p>
        )}
      </div>

      {/* Error / Success */}
      {errorMsg && <p className="text-[10px] text-red-600 font-sans bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">{errorMsg}</p>}
      {successMsg && <p className="text-[10px] text-emerald-700 font-sans bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">check_circle</span>{successMsg}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-[#1C1B18] hover:bg-[#8C6B1F] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 font-sans"
      >
        {submitting ? (
          <>
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Submit Report
          </>
        )}
      </button>
    </form>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BodyVisualizer() {
  const [mode, setMode] = useState<"detailed" | "keyframe">("detailed");
  const [stage, setStage] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number; visible: boolean }>({
    text: "",
    x: 0,
    y: 0,
    visible: false,
  });
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [pulseLayer, setPulseLayer] = useState<number | null>(null);
  const [clickedOrganTopId, setClickedOrganTopId] = useState<string | null>(null);

  // Right panel state
  const [selectedPart, setSelectedPart] = useState<DetailedStage | null>(null);
  const [medScans, setMedScans] = useState<DiseaseScan[]>([]);
  const [medReports, setMedReports] = useState<MedicalReport[]>([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medLoaded, setMedLoaded] = useState(false);
  const [rightTab, setRightTab] = useState<"timeline" | "report">("timeline");

  const activeList = mode === "detailed" ? DETAILED_STAGES : KEYFRAME_STAGES;
  const maxStages = activeList.length;
  const activeStage = activeList[stage - 1] || activeList[0];
  const isInternalOrgansActive =
    (mode === "keyframe" && stage === 3) ||
    (mode === "detailed" && stage >= 3 && stage <= 11);

  // Fetch medical history once on mount
  useEffect(() => {
    (async () => {
      setMedLoading(true);
      try {
        const resp = await fetch("/api/medical-history");
        if (resp.ok) {
          const data = await resp.json();
          setMedScans(data.scans || []);
          setMedReports(data.reports || []);
        }
      } catch (e) {
        // Silently fail — right panel will show empty state
      } finally {
        setMedLoading(false);
        setMedLoaded(true);
      }
    })();
  }, []);

  // Trigger layer pulse animation when stage changes
  useEffect(() => {
    setPulseLayer(stage);
    const timer = setTimeout(() => setPulseLayer(null), 600);
    return () => clearTimeout(timer);
  }, [stage, mode]);

  // Handle Autoplay Loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setStage((prev) => {
          if (prev < maxStages) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 1800);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, maxStages]);

  const handlePrev = () => {
    setIsPlaying(false);
    if (stage > 1) setStage(stage - 1);
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (stage < maxStages) setStage(stage + 1);
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (stage >= maxStages) {
        setStage(1);
      }
      setIsPlaying(true);
    }
  };

  const handleTimelineClick = (num: number) => {
    setIsPlaying(false);
    setStage(num);
  };

  const handleModeChange = (newMode: "detailed" | "keyframe") => {
    setIsPlaying(false);
    setMode(newMode);
    setStage(1);
  };

  const handleOrganClick = (stageItem: DetailedStage) => {
    const isSame = selectedPart?.id === stageItem.id;
    setSelectedPart(isSame ? null : stageItem);
    setClickedOrganTopId(isSame ? null : stageItem.id);
    setRightTab("timeline");
  };

  // Determine Layer Visibility
  const isLayerVisible = (stageItem: DetailedStage) => {
    if (mode === "detailed") {
      if (stage === 1) return stageItem.stage === 1;
      if (stage === 2) return stageItem.stage === 2;
      if (stage >= 3 && stage <= 11) {
        return stageItem.stage >= 3 && stageItem.stage <= stage;
      }
      if (stage === 12) return stageItem.stage === 12;
      if (stage === 13) return stageItem.stage === 13;
      return false;
    } else {
      const allowedGroups = new Set((activeStage as KeyFrameStage).layers || []);
      return allowedGroups.has(stageItem.id);
    }
  };

  // Automatically deselect if the currently selected part becomes hidden due to navigation
  useEffect(() => {
    if (selectedPart && !isLayerVisible(selectedPart)) {
      setSelectedPart(null);
      setClickedOrganTopId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mode, selectedPart]);

  // Tooltip Handlers
  const handleMouseEnter = (e: React.MouseEvent, labelText: string, id: string) => {
    setHoveredLayer(id);
    setTooltip({
      text: labelText,
      x: e.clientX + 16,
      y: e.clientY - 10,
      visible: true,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX + 16,
      y: e.clientY - 10,
    }));
  };

  const handleMouseLeave = () => {
    setHoveredLayer(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const progressPercent = ((stage - 1) / (maxStages - 1)) * 100;

  return (
    <div className="flex flex-col xl:flex-row min-h-[700px] w-full bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] overflow-hidden shadow-xs relative">
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed pointer-events-none bg-[#1C1B18]/95 backdrop-blur-md text-[#F6F4EF] px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[#8C6B1F]/30 shadow-md z-[9999] transition-opacity duration-150"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}


      {/* ── Body Viewer ─────────────────────────────────────────────────────── */}
      <section className="flex-1 min-h-[500px] flex flex-col items-center justify-start pt-4 pb-6 px-6 relative overflow-hidden bg-radial from-[#F4E071]/5 to-transparent">
        {/* ── 5 Keyframe Quick-Select Tabs ── */}
        <div className="flex gap-1.5 mb-4 z-20 flex-wrap justify-center">
          {KEYFRAME_STAGES.map((kf) => {
            const isKfActive = mode === "keyframe" && stage === kf.stage;
            return (
              <button
                key={kf.stage}
                onClick={() => {
                  setIsPlaying(false);
                  setMode("keyframe");
                  setStage(kf.stage);
                }}
                title={kf.name}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-sans border transition-all cursor-pointer whitespace-nowrap ${
                  isKfActive
                    ? "text-white shadow-sm"
                    : "bg-white/80 border-[#E6E1D3] text-[#4D493E] hover:border-[#8C6B1F] hover:bg-[#FAF6E8]"
                }`}
                style={isKfActive ? { backgroundColor: kf.color, borderColor: kf.color } : {}}
              >
                <span>{kf.emoji}</span>
                <span className="hidden sm:inline">{kf.name.replace(/^Frame \d+:\s*/, "")}</span>
              </button>
            );
          })}
        </div>

        {/* Glow behind body */}
        <div
          className="absolute w-80 h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: activeStage.color }}
        />

        {selectedPart && (
          <div className="mb-4 flex items-center gap-2 bg-[#1C1B18]/90 text-white px-3 py-1.5 rounded-full text-[10px] font-bold font-sans z-20 backdrop-blur-sm transition-all duration-200">
            <span>{selectedPart.emoji}</span>
            <span>{selectedPart.name} selected</span>
            <button
              onClick={() => setSelectedPart(null)}
              className="ml-1 hover:text-red-300 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-3xl mt-4 relative z-10">
          {/* Organ Selector (Left Side) */}
          {isInternalOrgansActive && (
            <div className="w-full md:w-56 bg-white/75 backdrop-blur-md border border-[#E6E1D3] rounded-2xl p-4 flex flex-col gap-2 shadow-xs z-20 md:self-start md:mt-6 transition-all duration-300">
              <p className="text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-1 font-sans flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">view_cozy</span>
                Select Organ
              </p>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 max-h-[300px] md:max-h-[500px] overflow-y-auto pr-1">
                {INTERNAL_ORGANS_LIST.map((organ) => {
                  const stageItem = DETAILED_STAGES.find((s) => s.id === organ.id);
                  if (!stageItem) return null;
                  const isSelected = selectedPart?.id === organ.id;
                  return (
                    <button
                      key={organ.id}
                      onClick={() => handleOrganClick(stageItem)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold font-sans border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1C1B18] text-white shadow-xs border-[#1C1B18]"
                          : "bg-white/80 border-[#E6E1D3] text-[#4D493E] hover:border-[#8C6B1F] hover:bg-[#FAF6E8]"
                      }`}
                    >
                      <span className="text-base shrink-0">{organ.emoji}</span>
                      <span className="truncate">{organ.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Body Model Relative Stack Container */}
          <div className="relative w-[300px] h-[500px] sm:w-[340px] sm:h-[580px] shrink-0">
            {DETAILED_STAGES.map((stageItem) => {
              const visible = isLayerVisible(stageItem);
              const isPulse = pulseLayer === stageItem.stage;
              const positions = stageItem.positions || (stageItem.position ? [stageItem.position] : [null]);
              const isSelected = selectedPart?.id === stageItem.id;

              return positions.map((pos, idx) => {
                const uniqueId = positions.length > 1 ? `${stageItem.id}-${idx}` : stageItem.id;
                const isHovered = hoveredLayer === uniqueId;
                const labelText =
                  positions.length > 1
                    ? `${stageItem.name} (${idx === 0 ? "Left" : "Right"})`
                    : stageItem.name;

                const isOrganOnTop = clickedOrganTopId === stageItem.id;
                const baseStyles: React.CSSProperties = {
                  position: "absolute",
                  zIndex: isOrganOnTop ? 100 : stageItem.zIndex,
                  transition: "opacity 0.4s ease, transform 0.4s ease, filter 0.2s ease, z-index 0s",
                  opacity: visible ? 1 : 0,
                  pointerEvents: visible && stageItem.type === "organ" ? "auto" : "none",
                  cursor: stageItem.type === "organ" ? "pointer" : "default",
                };

                if (stageItem.type === "full-body") {
                  const isCirculatory = stageItem.id === "circulatory";
                  baseStyles.top = 0;
                  baseStyles.left = "50%";
                  baseStyles.transform = `translateX(-50%) ${
                    visible
                      ? isCirculatory
                        ? "scale(1.4)"
                        : "scale(1)"
                      : isCirculatory
                      ? "scale(1.37)"
                      : "scale(0.97)"
                  }`;
                  baseStyles.width = "auto";
                  baseStyles.height = "100%";
                  baseStyles.objectFit = "contain";
                } else if (pos) {
                  baseStyles.top = pos.top;
                  baseStyles.left = pos.left;
                  baseStyles.width = pos.width;
                  if (pos.height) baseStyles.height = pos.height;
                  baseStyles.transform = `${pos.transform} ${visible ? "scale(1)" : "scale(0.85)"}`;
                  baseStyles.objectFit = "contain";
                }

                let filterString = "";
                if (isSelected) {
                  filterString = `drop-shadow(0 0 14px ${stageItem.color}) brightness(1.1)`;
                } else if (isHovered) {
                  filterString = "drop-shadow(0 0 10px rgba(140, 107, 31, 0.8)) brightness(1.05)";
                } else if (isPulse) {
                  filterString = "drop-shadow(0 0 12px rgba(28, 27, 24, 0.7))";
                }
                if (filterString) {
                  baseStyles.filter = filterString;
                }

                return (
                  <div
                    key={uniqueId}
                    style={baseStyles}
                    className={`select-none ${visible ? "" : "pointer-events-none"}`}
                    onMouseEnter={(e) => handleMouseEnter(e, `${stageItem.emoji} ${labelText}`, uniqueId)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => visible && stageItem.type === "organ" && handleOrganClick(stageItem)}
                  >
                    <img
                      src={stageItem.file}
                      alt={stageItem.name}
                      draggable={false}
                      className="w-full h-full object-contain"
                    />
                  </div>
                );
              });
            })}
          </div>
        </div>
      </section>

      {/* ── Right Panel ─────────────────────────────────────────────────────── */}
      <aside className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-[#E6E1D3] bg-[#FAF9F5] flex flex-col shrink-0 overflow-hidden">
        {/* Right panel tab switcher */}
        <div className="flex gap-1.5 p-3 border-b border-[#E6E1D3] bg-white/60">
          <button
            onClick={() => setRightTab("timeline")}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 font-sans ${
              rightTab === "timeline"
                ? "bg-[#1C1B18] text-white"
                : "text-[#787363] hover:text-[#1C1B18] bg-transparent"
            }`}
          >
            <span className="material-symbols-outlined text-[12px]">timeline</span>
            Part Timeline
          </button>
          <button
            onClick={() => setRightTab("report")}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 font-sans ${
              rightTab === "report"
                ? "bg-[#1C1B18] text-white"
                : "text-[#787363] hover:text-[#1C1B18] bg-transparent"
            }`}
          >
            <span className="material-symbols-outlined text-[12px]">add_circle</span>
            Report New Problem
          </button>
        </div>

        {/* Part Timeline section */}
        {rightTab === "timeline" && (() => {
          const isFullBodyActive = 
            (mode === "detailed" && (stage === 1 || stage === 2 || stage === 12 || stage === 13)) ||
            (mode === "keyframe" && (stage === 1 || stage === 2 || stage === 4 || stage === 5));

          const activeId = isFullBodyActive
            ? (mode === "detailed"
                ? (stage === 1 ? "skeleton" : stage === 2 ? "circulatory" : stage === 12 ? "muscles" : "skin")
                : (stage === 1 ? "skeleton" : stage === 2 ? "circulatory" : stage === 4 ? "muscles" : "skin"))
            : null;

          const activeStageObj = activeId ? DETAILED_STAGES.find((s) => s.id === activeId) : null;
          const activeName = activeStageObj ? activeStageObj.name : "";
          const activeEmoji = activeStageObj ? activeStageObj.emoji : "";

          let allTitle = "All Medical Reports";
          if (isFullBodyActive) {
            if (activeId === "skeleton") allTitle = "Bone Structure - Reports";
            else if (activeId === "circulatory") allTitle = "Circulatory System - Reports";
            else if (activeId === "muscles") allTitle = "Muscular System - Reports";
            else if (activeId === "skin") allTitle = "Full Body - Reports";
          }

          return (
            <div className="flex-1 p-4 flex flex-col overflow-hidden">
              <div className="text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-3 font-sans flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#8C6B1F]">timeline</span>
                {isFullBodyActive ? allTitle : (selectedPart ? `${selectedPart.name} — History` : "Organ Timeline")}
              </div>
              <PartTimelinePanel
                selectedPartId={isFullBodyActive ? activeId : (selectedPart?.id || null)}
                selectedPartName={isFullBodyActive ? activeName : (selectedPart?.name || "")}
                selectedPartEmoji={isFullBodyActive ? activeEmoji : (selectedPart?.emoji || "")}
                scans={medScans}
                reports={medReports}
                loading={medLoading}
                showAll={false}
                allTitle={allTitle}
              />
            </div>
          );
        })()}

        {/* Report New Problem section */}
        {rightTab === "report" && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] font-bold text-[#4D493E] uppercase tracking-wider mb-1 font-sans flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#8C6B1F]">add_circle</span>
              Report New Problem
            </div>
            <p className="text-[9px] text-[#787363] font-sans mb-3 leading-relaxed">
              Log a symptom, upload a scan image or PDF, or describe a condition. It will appear in your Medical History.
            </p>
            <ReportNewProblemForm
              selectedPart={selectedPart}
              onSuccess={() => {
                // Refresh medical records
                fetch("/api/medical-history")
                  .then((r) => r.json())
                  .then((d) => {
                    setMedScans(d.scans || []);
                    setMedReports(d.reports || []);
                  })
                  .catch(() => {});
              }}
            />
          </div>
        )}
      </aside>
    </div>
  );
}

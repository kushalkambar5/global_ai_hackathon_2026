"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiseaseScan {
  id: string;
  scanType: string;
  inputImageUrl: string | null;
  predictionResult: any;
  status: string;
  aiExplanation: string | null;
  aiSuggestions: string[] | null;
  medicines: string[] | null;
  affectedParts: number[] | null;
  createdAt: string;
  completedAt: string | null;
}

interface MedicalReport {
  id: string;
  title: string;
  description: string | null;
  reportType: string | null;
  fileUrl: string | null;
  fileType: string | null;
  extractedData: any;
  aiSummary: any;
  affectedParts: number[] | null;
  medicines: string[] | null;
  reportDate: string | null;
  uploadedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCAN_ICON: Record<string, string> = {
  BONE_FRACTURE: "radiology",
  BRAIN_TUMOR: "neurology",
  ECG: "cardiology",
  HEART: "favorite",
  SKIN: "dermatology",
  CHEST: "pulmonology",
};

const SCAN_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  BONE_FRACTURE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  BRAIN_TUMOR: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  ECG: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  HEART: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  SKIN: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  CHEST: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
};

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

const REPORT_TYPE_ICON: Record<string, string> = {
  LAB: "science",
  IMAGING: "radiology",
  PRESCRIPTION: "medication",
  DISCHARGE: "local_hospital",
  OTHER: "description",
};

const REPORT_TYPE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  LAB: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  IMAGING: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  PRESCRIPTION: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  DISCHARGE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  OTHER: { bg: "bg-[#FAF6E8]", text: "text-[#8C6B1F]", border: "border-[#E6E1D3]" },
};

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  PROCESSING: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  FAILED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDiagnosis(pr: any, scanType: string) {
  if (!pr) return null;
  return (
    pr.diagnosis ||
    pr.diagnosis_result ||
    (pr.tumor_found ? "Tumor Detected" : undefined) ||
    (pr.risk_prediction === 1 ? "High Risk" : pr.risk_prediction === 0 ? "Low Risk" : undefined) ||
    null
  );
}

function PredictionResultDetails({ scan }: { scan: DiseaseScan }) {
  const pr = scan.predictionResult;
  const scanType = scan.scanType;
  const [showRaw, setShowRaw] = useState(false);

  if (!pr) return null;

  const renderContent = () => {
    switch (scanType) {
      case "BONE_FRACTURE": {
        const diagnosis = pr.diagnosis || "Unknown";
        const confidence = pr.confidence !== undefined ? pr.confidence : null;
        const isFractured = diagnosis.toLowerCase() === "fractured";

        return (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isFractured 
                ? "bg-red-50/60 border-red-200 text-red-800" 
                : "bg-emerald-50/60 border-emerald-200 text-emerald-800"
            }`}>
              <span className="material-symbols-outlined text-xl shrink-0">
                {isFractured ? "warning" : "check_circle"}
              </span>
              <div>
                <p className="font-serif text-sm font-bold capitalize">
                  {diagnosis} Detected
                </p>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  AI Model analysis indicates a {isFractured ? "fractured bone structure" : "normal bone structure"}.
                </p>
              </div>
            </div>

            {confidence !== null && (
              <div className="bg-white border border-[#E6E1D3]/60 rounded-xl p-3 space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-semibold text-[#4D493E]">
                  <span>Model Confidence</span>
                  <span className="text-[#8C6B1F] font-bold">{confidence}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFractured ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      }

      case "BRAIN_TUMOR": {
        const detections = pr.detections || [];
        const tumorFound = pr.tumor_found || detections.length > 0;

        return (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              tumorFound 
                ? "bg-red-50/60 border-red-200 text-red-800" 
                : "bg-emerald-50/60 border-emerald-200 text-emerald-800"
            }`}>
              <span className="material-symbols-outlined text-xl shrink-0">
                {tumorFound ? "warning" : "check_circle"}
              </span>
              <div>
                <p className="font-serif text-sm font-bold">
                  {tumorFound ? "Tumor Detected" : "No Tumor Found"}
                </p>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  {tumorFound 
                    ? `AI Model identified ${detections.length} anomaly area(s).` 
                    : "No tumor-like anomalous formations were identified by the AI model."}
                </p>
              </div>
            </div>

            {detections.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#787363] font-sans">
                  Detected Regions ({detections.length})
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {detections.map((d: any, i: number) => {
                    const cls = d.class || "anomaly";
                    const conf = d.confidence || 0;
                    const bbox = d.bbox || [];
                    
                    return (
                      <div key={i} className="bg-white border border-[#E6E1D3]/60 rounded-xl p-3 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#1C1B18] capitalize flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            {cls === "cake" ? "Tumor" : cls}
                          </span>
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            {conf}% confidence
                          </span>
                        </div>
                        {bbox.length === 4 && (
                          <div className="pt-1.5 border-t border-gray-50 flex items-center justify-between text-[9px] text-[#787363] font-mono">
                            <span>Bounding Box:</span>
                            <span>
                              [{Math.round(bbox[0])}, {Math.round(bbox[1])}] to [{Math.round(bbox[2])}, {Math.round(bbox[3])}]
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case "ECG": {
        const diagnosis = pr.diagnosis || "Unknown Rhythm";
        const confidence = pr.confidence !== undefined ? pr.confidence : null;
        const isNormal = diagnosis.toLowerCase().includes("normal");

        return (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isNormal 
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" 
                : "bg-amber-50/60 border-amber-200 text-amber-800"
            }`}>
              <span className="material-symbols-outlined text-xl shrink-0 animate-pulse text-red-600">
                pulse
              </span>
              <div>
                <p className="font-serif text-sm font-bold">
                  {diagnosis}
                </p>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  {isNormal 
                    ? "Normal heart rhythm activity detected." 
                    : "Anomalous electrocardiogram rhythm detected. Review by a cardiologist recommended."}
                </p>
              </div>
            </div>

            {confidence !== null && (
              <div className="bg-white border border-[#E6E1D3]/60 rounded-xl p-3 space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-semibold text-[#4D493E]">
                  <span>Model Confidence</span>
                  <span className="text-[#8C6B1F] font-bold">{confidence}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isNormal ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      }

      case "HEART": {
        const prob = pr.disease_probability !== undefined ? pr.disease_probability : null;
        const risk = pr.risk_prediction !== undefined ? pr.risk_prediction : null;
        const diagnosis = pr.diagnosis || (risk === 1 ? "High Risk" : "Low Risk");
        const isHigh = risk === 1;

        return (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isHigh 
                ? "bg-red-50/60 border-red-200 text-red-800" 
                : "bg-emerald-50/60 border-emerald-200 text-emerald-800"
            }`}>
              <span className="material-symbols-outlined text-xl shrink-0">
                {isHigh ? "heart_broken" : "favorite"}
              </span>
              <div>
                <p className="font-serif text-sm font-bold">
                  {diagnosis} Cardiovascular Profile
                </p>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  {isHigh 
                    ? "XGBoost model identifies elevated markers indicating cardiovascular disease risk factors." 
                    : "Low level of risk factors detected across inputs."}
                </p>
              </div>
            </div>

            {prob !== null && (
              <div className="bg-white border border-[#E6E1D3]/60 rounded-xl p-3 space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-semibold text-[#4D493E]">
                  <span>Disease Probability</span>
                  <span className={`font-bold ${isHigh ? "text-red-600" : "text-emerald-600"}`}>
                    {prob}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHigh ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${prob}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      }

      case "SKIN": {
        const diagnosis = pr.diagnosis || "Unknown";
        const confidence = pr.confidence !== undefined ? pr.confidence : null;
        const formattedDiagnosis = diagnosis.replace(/_/g, " ");
        const isBenign = formattedDiagnosis.toLowerCase().includes("benign");

        return (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isBenign 
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" 
                : "bg-amber-50/60 border-amber-200 text-amber-800"
            }`}>
              <span className="material-symbols-outlined text-xl shrink-0">
                {isBenign ? "check_circle" : "warning"}
              </span>
              <div>
                <p className="font-serif text-sm font-bold capitalize">
                  {formattedDiagnosis}
                </p>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  AI Model dermatological scan result.
                </p>
              </div>
            </div>

            {confidence !== null && (
              <div className="bg-white border border-[#E6E1D3]/60 rounded-xl p-3 space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-semibold text-[#4D493E]">
                  <span>Model Confidence</span>
                  <span className="text-[#8C6B1F] font-bold">{confidence}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isBenign ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      }

      case "CHEST": {
        const pathologies = pr.pathology_probabilities || {};
        const sortedPathologies = Object.entries(pathologies)
          .map(([name, val]) => ({ name, val: Number(val) }))
          .sort((a, b) => b.val - a.val);

        if (sortedPathologies.length === 0) return <p className="text-xs text-gray-400 font-sans">No pathology data found.</p>;

        return (
          <div className="space-y-3">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[#787363] font-sans">
              Pathology Probability Scores
            </span>
            <div className="bg-white border border-[#E6E1D3]/60 rounded-xl p-3.5 space-y-3 shadow-sm max-h-60 overflow-y-auto custom-scrollbar">
              {sortedPathologies.map((path: any, index: number) => {
                const isHigh = path.val >= 10;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold font-sans">
                      <span className={`${isHigh ? "text-red-700 font-bold" : "text-[#4D493E]"}`}>
                        {path.name}
                      </span>
                      <span className={isHigh ? "text-red-700 font-bold" : "text-[#787363]"}>
                        {path.val}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? "bg-red-500" : "bg-sky-500"
                        }`}
                        style={{ width: `${path.val}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      default:
        return (
          <pre className="text-[10px] font-mono bg-[#1C1B18] text-emerald-400 rounded-xl p-3 overflow-x-auto leading-relaxed">
            {JSON.stringify(pr, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] font-sans">
          Model Prediction Report
        </span>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-[9px] font-bold uppercase text-[#8C6B1F] hover:underline flex items-center gap-0.5 cursor-pointer bg-none border-none p-0"
        >
          {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-[10px] font-mono bg-[#1C1B18] text-emerald-400 rounded-xl p-3 overflow-x-auto leading-relaxed mt-1">
          {JSON.stringify(pr, null, 2)}
        </pre>
      ) : (
        <div className="bg-[#FAF9F5]/40 border border-[#E6E1D3]/50 rounded-2xl p-4 mt-1">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScanCard({ scan }: { scan: DiseaseScan }) {
  const [expanded, setExpanded] = useState(false);
  const colors = SCAN_COLOR[scan.scanType] || { bg: "bg-[#FAF6E8]", text: "text-[#8C6B1F]", border: "border-[#E6E1D3]" };
  const statusC = STATUS_COLOR[scan.status] || STATUS_COLOR["PENDING"];
  const diagnosis = getDiagnosis(scan.predictionResult, scan.scanType);

  return (
    <div className="bg-white border border-[#E6E1D3] rounded-[24px] overflow-hidden shadow-xs hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-start gap-4 p-5">
        {/* Scan Image or Icon */}
        <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
          {scan.inputImageUrl ? (
            <img src={scan.inputImageUrl} alt="scan" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span className={`material-symbols-outlined text-2xl ${colors.text}`}>
              {SCAN_ICON[scan.scanType] || "biotech"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${colors.bg} ${colors.text} border ${colors.border}`}>
              {scan.scanType.replace(/_/g, " ")}
            </span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusC.bg} ${statusC.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusC.dot}`} />
              {scan.status}
            </span>
          </div>

          {diagnosis && (
            <p className="mt-1.5 font-serif text-sm font-bold text-[#1C1B18] truncate">
              {diagnosis}
            </p>
          )}
          <p className="text-[10px] text-[#787363] font-sans mt-0.5">
            Scanned: {fmtDate(scan.createdAt)}
            {scan.completedAt && ` · Completed: ${fmtDate(scan.completedAt)}`}
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-full hover:bg-[#FAF6E8] text-[#787363] hover:text-[#1C1B18] transition-colors shrink-0 cursor-pointer"
          aria-label="Expand scan"
        >
          <span className={`material-symbols-outlined text-lg transition-transform ${expanded ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-[#F0EBE0] px-5 pb-5 pt-4 space-y-4 bg-[#FAF9F5]">

          {/* AI Explanation */}
          {scan.aiExplanation && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">AI Medical Explanation</span>
              <p className="text-xs text-[#4D493E] font-sans leading-relaxed bg-white border border-[#E6E1D3]/60 rounded-xl p-3">
                {scan.aiExplanation}
              </p>
            </div>
          )}

          {/* AI Suggestions */}
          {scan.aiSuggestions && scan.aiSuggestions.length > 0 && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1.5 font-sans">Recommendations</span>
              <ul className="space-y-1.5">
                {scan.aiSuggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#4D493E] font-sans">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[10px] text-emerald-700">check</span>
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Medicines */}
          {scan.medicines && scan.medicines.length > 0 && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1.5 font-sans">Medicines / Treatments</span>
              <div className="flex flex-wrap gap-1.5">
                {scan.medicines.map((m, i) => (
                  <span key={i} className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-sans">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Affected Parts */}
          {scan.affectedParts && scan.affectedParts.length > 0 && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1.5 font-sans">Affected Body Parts</span>
              <div className="flex flex-wrap gap-1.5">
                {scan.affectedParts.map((part, i) => (
                  <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} font-sans`}>
                    {part}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prediction Result Details */}
          {scan.predictionResult && (
            <PredictionResultDetails scan={scan} />
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: MedicalReport }) {
  const [expanded, setExpanded] = useState(false);
  const rType = report.reportType || "OTHER";
  const colors = REPORT_TYPE_COLOR[rType] || REPORT_TYPE_COLOR["OTHER"];
  const icon = REPORT_TYPE_ICON[rType] || "description";

  return (
    <div className="bg-white border border-[#E6E1D3] rounded-[24px] overflow-hidden shadow-xs hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-start gap-4 p-5">
        <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined text-2xl ${colors.text}`}>{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${colors.bg} ${colors.text} border ${colors.border}`}>
              {rType.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1.5 font-serif text-sm font-bold text-[#1C1B18] truncate">{report.title}</p>
          <p className="text-[10px] text-[#787363] font-sans mt-0.5">
            {report.reportDate ? `Report Date: ${fmtDate(report.reportDate)} · ` : ""}
            Uploaded: {fmtDate(report.uploadedAt)}
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-full hover:bg-[#FAF6E8] text-[#787363] hover:text-[#1C1B18] transition-colors shrink-0 cursor-pointer"
          aria-label="Expand report"
        >
          <span className={`material-symbols-outlined text-lg transition-transform ${expanded ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-[#F0EBE0] px-5 pb-5 pt-4 space-y-4 bg-[#FAF9F5]">

          {/* Description */}
          {report.description && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">Description</span>
              <p className="text-xs text-[#4D493E] font-sans leading-relaxed bg-white border border-[#E6E1D3]/60 rounded-xl p-3">
                {report.description}
              </p>
            </div>
          )}

          {/* AI Summary */}
          {report.aiSummary && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">AI Summary</span>
              <p className="text-xs text-[#4D493E] font-sans leading-relaxed bg-white border border-[#E6E1D3]/60 rounded-xl p-3">
                {typeof report.aiSummary === "string"
                  ? report.aiSummary
                  : JSON.stringify(report.aiSummary, null, 2)}
              </p>
            </div>
          )}

          {/* Medicines */}
          {report.medicines && report.medicines.length > 0 && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1.5 font-sans">Medicines / Prescriptions</span>
              <div className="flex flex-wrap gap-1.5">
                {report.medicines.map((m, i) => (
                  <span key={i} className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-sans">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Data */}
          {report.extractedData && (
            <div>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">Extracted Clinical Data</span>
              <pre className="text-[10px] font-mono bg-[#1C1B18] text-emerald-400 rounded-xl p-3 overflow-x-auto leading-relaxed">
                {JSON.stringify(report.extractedData, null, 2)}
              </pre>
            </div>
          )}

          {/* File Link */}
          {report.fileUrl && (
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 transition-opacity font-sans`}
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View Report File
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ scans, reports }: { scans: DiseaseScan[]; reports: MedicalReport[] }) {
  const completedScans = scans.filter((s) => s.status === "COMPLETED").length;
  const scanTypes = [...new Set(scans.map((s) => s.scanType))].length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { icon: "biotech", label: "Total AI Scans", value: scans.length, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
        { icon: "check_circle", label: "Completed Scans", value: completedScans, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
        { icon: "description", label: "Medical Reports", value: reports.length, color: "text-sky-600", bg: "bg-sky-50 border-sky-100" },
        { icon: "category", label: "Scan Categories", value: scanTypes, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
      ].map((stat) => (
        <div key={stat.label} className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[24px] p-5 shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${stat.bg}`}>
            <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
          </div>
          <div>
            <p className="text-[10px] font-sans text-[#787363] font-medium">{stat.label}</p>
            <p className="font-serif text-2xl font-bold text-[#1C1B18] leading-tight">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "scans" | "reports" | "timeline";

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineItem {
  id: string;
  kind: "scan" | "report";
  date: Date;
  scan?: DiseaseScan;
  report?: MedicalReport;
}

function buildTimeline(scans: DiseaseScan[], reports: MedicalReport[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...scans.map((s) => ({ id: s.id, kind: "scan" as const, date: new Date(s.createdAt), scan: s })),
    ...reports.map((r) => ({ id: r.id, kind: "report" as const, date: new Date(r.uploadedAt), report: r })),
  ];
  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function getMonthKey(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function TimelineView({ scans, reports, searchQuery }: { scans: DiseaseScan[]; reports: MedicalReport[]; searchQuery: string }) {
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

  const allItems = buildTimeline(scans, reports).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (item.kind === "scan") {
      const s = item.scan!;
      return s.scanType.toLowerCase().includes(q) ||
        (s.aiExplanation || "").toLowerCase().includes(q) ||
        JSON.stringify(s.predictionResult || {}).toLowerCase().includes(q);
    } else {
      const r = item.report!;
      return r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    }
  });

  if (allItems.length === 0) {
    return (
      <div className="py-24 text-center bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-5xl text-[#DCD5C5]">timeline</span>
        <p className="font-serif font-bold text-[#4D493E]">No records to display</p>
        <p className="text-xs text-[#787363] font-sans max-w-xs leading-relaxed">
          Your complete medical timeline will appear here once you have disease scans or medical reports.
        </p>
      </div>
    );
  }

  // Group by month
  const grouped: { key: string; items: TimelineItem[] }[] = [];
  for (const item of allItems) {
    const key = getMonthKey(item.date);
    const last = grouped[grouped.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      grouped.push({ key, items: [item] });
    }
  }

  return (
    <div className="space-y-0">
      {grouped.map((group, gi) => (
        <div key={group.key}>
          {/* Month divider */}
          <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="px-4 py-1.5 bg-[#1C1B18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full font-sans">
              {group.key}
            </div>
            <div className="flex-1 h-px bg-[#E6E1D3]" />
          </div>

          {/* Items in this month */}
          <div className="relative pl-10 space-y-4 mb-8">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#8C6B1F] via-[#E6E1D3] to-transparent" />

            {group.items.map((item, ii) => {
              const isScan = item.kind === "scan";
              const s = item.scan;
              const r = item.report;
              const dotColor = isScan ? "bg-purple-500" : "bg-sky-500";
              const cardBg = isScan ? "bg-purple-50 border-purple-200" : "bg-sky-50 border-sky-200";
              const badgeCls = isScan ? "text-purple-700 bg-purple-100 border-purple-200" : "text-sky-700 bg-sky-100 border-sky-200";
              const expandedBorderCls = isScan ? "border-purple-200" : "border-sky-200";
              const day = item.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
              const time = item.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
              const isOpen = expandedIds.has(item.id);

              const diagnosis = s ? (s.predictionResult?.diagnosis || s.predictionResult?.diagnosis_result ||
                (s.predictionResult?.tumor_found ? "Tumor Detected" : null) ||
                (s.predictionResult?.risk_prediction === 1 ? "High Risk" : s.predictionResult?.risk_prediction === 0 ? "Low Risk" : null)) : null;

              return (
                <div key={item.id} className="relative flex gap-4 items-start group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-7 w-4 h-4 rounded-full border-2 border-white shadow-sm ${dotColor} z-10 top-4 transition-transform group-hover:scale-125`} />
                  {/* Horizontal connector */}
                  <div className="absolute left-[-18px] top-[22px] w-5 h-0.5 bg-[#E6E1D3]" />

                  {/* Date pill */}
                  <div className="shrink-0 text-center pt-3">
                    <div className="text-[10px] font-bold text-[#787363] font-sans whitespace-nowrap">{day}</div>
                    <div className="text-[9px] text-[#A8A28E] font-sans">{time}</div>
                  </div>

                  {/* Card */}
                  <div className={`flex-1 border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all ${cardBg}`}>
                    {/* Card header — always visible, click to expand */}
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badgeCls} font-sans`}>
                            {isScan ? `AI Scan · ${s!.scanType.replace(/_/g, " ")}` : `Report · ${r!.reportType || "OTHER"}`}
                          </span>
                          {isScan && (
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                              s!.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>{s!.status}</span>
                          )}
                        </div>
                        <h4 className="font-serif text-sm font-bold text-[#1C1B18] leading-tight truncate">
                          {isScan ? (diagnosis || s!.scanType.replace(/_/g, " ")) : r!.title}
                        </h4>
                        {/* Tags row */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {isScan && s!.affectedParts?.slice(0, 3).map((p, pi) => (
                            <span key={pi} className="text-[9px] font-semibold bg-white border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-sans">
                              {STAGE_NAME_MAP[p] || `Part ${p}`}
                            </span>
                          ))}
                          {isScan && s!.medicines?.slice(0, 2).map((m, mi) => (
                            <span key={mi} className="text-[9px] font-semibold bg-white border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-sans">{m}</span>
                          ))}
                          {!isScan && r!.affectedParts?.slice(0, 3).map((p, pi) => (
                            <span key={`p-${pi}`} className="text-[9px] font-semibold bg-white border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-sans">
                              {STAGE_NAME_MAP[p] || `Part ${p}`}
                            </span>
                          ))}
                          {!isScan && r!.medicines?.slice(0, 3).map((m, mi) => (
                            <span key={mi} className="text-[9px] font-semibold bg-white border border-sky-200 text-sky-700 px-1.5 py-0.5 rounded-full font-sans">{m}</span>
                          ))}
                        </div>
                      </div>
                      <span
                        className={`material-symbols-outlined text-lg shrink-0 mt-0.5 transition-transform duration-200 ${isScan ? "text-purple-400" : "text-sky-400"}`}
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        expand_more
                      </span>
                    </button>

                    {/* Expanded details — only shown for THIS card */}
                    {isOpen && (
                      <div className={`px-4 pb-4 pt-2 space-y-3 border-t ${expandedBorderCls} bg-white/60`}>
                        {isScan && s!.aiExplanation && (
                          <div>
                            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">AI Explanation</span>
                            <p className="text-[11px] text-[#4D493E] font-sans leading-relaxed">{s!.aiExplanation}</p>
                          </div>
                        )}
                        {isScan && s!.aiSuggestions && s!.aiSuggestions.length > 0 && (
                          <div>
                            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#4D493E] mb-1.5 font-sans">Recommendations</span>
                            <ul className="space-y-1">
                              {s!.aiSuggestions.map((sg, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#4D493E] font-sans">
                                  <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[9px] text-emerald-700">check</span>
                                  </span>
                                  {sg}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!isScan && r!.description && (
                          <div>
                            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">Description</span>
                            <p className="text-[11px] text-[#4D493E] font-sans leading-relaxed">{r!.description}</p>
                          </div>
                        )}
                        {!isScan && r!.aiSummary && (
                          <div>
                            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#4D493E] mb-1 font-sans">AI Summary</span>
                            <p className="text-[11px] text-[#4D493E] font-sans leading-relaxed">
                              {typeof r!.aiSummary === "string"
                                ? r!.aiSummary
                                : r!.aiSummary.summary || JSON.stringify(r!.aiSummary, null, 2)}
                            </p>
                          </div>
                        )}
                        {!isScan && r!.fileUrl && (
                          <a
                            href={r!.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl border bg-white text-sky-700 border-sky-200 hover:opacity-80 transition-opacity font-sans"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                            View Report File
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MedicalHistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [scans, setScans] = useState<DiseaseScan[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("scans");
  const [scanFilter, setScanFilter] = useState<string>("ALL");
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session && !session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/medical-history");
        if (!resp.ok) throw new Error("Failed to fetch medical history.");
        const data = await resp.json();
        setScans(data.scans || []);
        setReports(data.reports || []);
      } catch (err: any) {
        setError(err.message || "Failed to load medical history.");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
        <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-[#787363]">Loading medical records...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) return null;

  // ── Filtered data ──
  const filteredScans = scans.filter((s) => {
    const matchType = scanFilter === "ALL" || s.scanType === scanFilter;
    const matchSearch = !searchQuery || s.scanType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.aiExplanation || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(s.predictionResult || {}).toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const filteredReports = reports.filter((r) => {
    const matchType = reportFilter === "ALL" || r.reportType === reportFilter;
    const matchSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const scanTypes = ["ALL", ...Array.from(new Set(scans.map((s) => s.scanType)))];
  const reportTypes = ["ALL", ...Array.from(new Set(reports.map((r) => r.reportType || "OTHER")))];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18]">
      <HeaderNav />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Page Header */}
        <section className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF6E8] border border-[#E6E1D3] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl text-[#8C6B1F]">history_edu</span>
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-[#8C6B1F] bg-[#FAF6E8] border border-[#E6E1D3] px-3 py-1 rounded-full uppercase">
                  Clinical Records
                </span>
                <h1 className="font-serif text-3xl font-bold text-[#1C1B18] mt-2 leading-tight">
                  Medical History
                </h1>
                <p className="text-xs text-[#787363] font-sans mt-0.5">
                  All your AI disease scans and uploaded medical reports in one place.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#787363]">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] text-xs font-semibold font-sans"
              />
            </div>
          </div>
        </section>

        {/* Loading / Error */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px]">
            <svg className="animate-spin h-9 w-9 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-[#787363] font-sans">Retrieving medical records...</span>
          </div>
        )}

        {error && (
          <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-6 rounded-[32px] text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-[#B34515]">error</span>
            <p className="text-sm font-semibold font-sans">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#B34515] text-white text-xs font-semibold rounded-xl hover:bg-[#8C2E0B] transition-colors font-sans"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats */}
            <StatsBar scans={scans} reports={reports} />

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1 bg-[#FAF6E8] border border-[#E6E1D3] rounded-2xl max-w-lg">
              <button
                onClick={() => setActiveTab("scans")}
                className={`flex-1 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "scans"
                    ? "bg-[#1C1B18] text-white shadow-sm"
                    : "text-[#787363] hover:text-[#1C1B18]"
                }`}
              >
                <span className="material-symbols-outlined text-sm">biotech</span>
                AI Scans ({scans.length})
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`flex-1 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "reports"
                    ? "bg-[#1C1B18] text-white shadow-sm"
                    : "text-[#787363] hover:text-[#1C1B18]"
                }`}
              >
                <span className="material-symbols-outlined text-sm">description</span>
                Reports ({reports.length})
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex-1 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "timeline"
                    ? "bg-[#1C1B18] text-white shadow-sm"
                    : "text-[#787363] hover:text-[#1C1B18]"
                }`}
              >
                <span className="material-symbols-outlined text-sm">timeline</span>
                Timeline ({scans.length + reports.length})
              </button>
            </div>

            {/* ── SCANS TAB ── */}
            {activeTab === "scans" && (
              <section className="space-y-5">
                {/* Filter pills */}
                {scanTypes.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {scanTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setScanFilter(type)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer border font-sans ${
                          scanFilter === type
                            ? "bg-[#1C1B18] text-white border-[#1C1B18]"
                            : "bg-white text-[#4D493E] border-[#DCD5C5] hover:border-[#8C6B1F] hover:text-[#8C6B1F]"
                        }`}
                      >
                        {type === "ALL" ? "All Types" : type.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                )}

                {filteredScans.length === 0 ? (
                  <div className="py-20 text-center bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-5xl text-[#DCD5C5]">radiology</span>
                    <p className="font-serif font-bold text-[#4D493E]">No AI scans found</p>
                    <p className="text-xs text-[#787363] font-sans max-w-xs leading-relaxed">
                      {scans.length === 0
                        ? "You haven't run any disease detection scans yet. Head over to Detect Disease to get started."
                        : "No scans match the current search or filter."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredScans.map((scan) => (
                      <ScanCard key={scan.id} scan={scan} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── REPORTS TAB ── */}
            {activeTab === "reports" && (
              <section className="space-y-5">
                {/* Filter pills */}
                {reportTypes.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {reportTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setReportFilter(type)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer border font-sans ${
                          reportFilter === type
                            ? "bg-[#1C1B18] text-white border-[#1C1B18]"
                            : "bg-white text-[#4D493E] border-[#DCD5C5] hover:border-[#8C6B1F] hover:text-[#8C6B1F]"
                        }`}
                      >
                        {type === "ALL" ? "All Types" : type.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                )}

                {filteredReports.length === 0 ? (
                  <div className="py-20 text-center bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-5xl text-[#DCD5C5]">folder_open</span>
                    <p className="font-serif font-bold text-[#4D493E]">No medical reports found</p>
                    <p className="text-xs text-[#787363] font-sans max-w-xs leading-relaxed">
                      {reports.length === 0
                        ? "No medical reports have been uploaded to your profile yet."
                        : "No reports match the current search or filter."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredReports.map((report) => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── TIMELINE TAB ── */}
            {activeTab === "timeline" && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-lg text-[#8C6B1F]">timeline</span>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#1C1B18]">Chronological Medical Timeline</h2>
                    <p className="text-[10px] text-[#787363] font-sans">All scans and reports merged by date, most recent first.</p>
                  </div>
                </div>
                <TimelineView scans={scans} reports={reports} searchQuery={searchQuery} />
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import ScrollFloat from "@/components/ui/ScrollFloat";

const patientsList = [
  {
    id: "P-901",
    name: "Eleanor Vance",
    age: 48,
    gender: "Female",
    condition: "Chest X-Ray Opacity (YOLOv11)",
    status: "Pending Review",
    aiRec: "Initiate sputum culture & broad-spectrum antibiotic evaluation.",
  },
  {
    id: "P-902",
    name: "David Miller",
    age: 62,
    gender: "Male",
    condition: "Cardiovascular XGBoost Risk (34%)",
    status: "Doctor Verified ✓",
    aiRec: "Prescribe statin therapy and continuous smartwatch BP monitoring.",
  },
  {
    id: "P-903",
    name: "Aria Sharma",
    age: 31,
    gender: "Female",
    condition: "Dermatoscope Lesion Classifier",
    status: "Pending Review",
    aiRec: "Benign seborrheic keratosis pattern detected. Routine follow-up.",
  },
];

export function DoctorPortalPreview() {
  const [selectedPatient, setSelectedPatient] = useState(patientsList[0]);
  const [discussionInput, setDiscussionInput] = useState("");
  const [discussionHistory, setDiscussionHistory] = useState([
    {
      sender: "doctor",
      text: "AI Copilot, why did YOLOv11 flag the right lower lobe in Eleanor's scan?",
    },
    {
      sender: "ai",
      text: "The TorchXRayVision heatmap indicates a 98.4% opacity probability matching focal consolidation. I recommend correlation with elevated white blood cell count and clinical breath sounds.",
    },
  ]);

  const handleSendDiscussion = () => {
    if (!discussionInput.trim()) return;
    const newHistory = [
      ...discussionHistory,
      { sender: "doctor", text: discussionInput },
    ];
    setDiscussionHistory(newHistory);
    setDiscussionInput("");

    setTimeout(() => {
      setDiscussionHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I have updated the clinical rationale based on your input. Care plan draft has been saved to Eleanor Vance's chart.",
        },
      ]);
    }, 700);
  };

  return (
    <section id="doctor-portal" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Section Title */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <ScrollFloat
          as="h2"
          animationDuration={1}
          ease="back.inOut(2)"
          stagger={0.03}
          containerClassName="font-serif text-4xl sm:text-5xl font-normal text-[#1C1B18] tracking-tight"
        >
          Empowering Doctors with <span className="text-[#8C6B1F]">AI Copilots</span>
        </ScrollFloat>
        <p className="text-base text-[#595446] font-sans">
          A seamless portal where clinicians review connected patients, discuss cases directly with AI engines, edit recommendations, and approve final care plans.
        </p>
      </div>

      {/* Main Doctor Dashboard Box */}
      <div className="bg-[#FAF6E8] border border-[#EDE4CD] rounded-[32px] p-6 sm:p-8 shadow-sm">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Connected Patients List */}
          <div className="lg:col-span-4 space-y-4 bg-white border border-[#E3DAC4] p-5 rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#EBE6D8] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1B18] flex items-center gap-2">
                <MaterialIcon name="groups" className="text-base text-[#8C6B1F]" />
                Connected Patients (3)
              </span>
              <span className="text-[10px] bg-[#FAF6E8] border border-[#E8DAA8] text-[#8C6B1F] px-2 py-0.5 rounded-full font-bold">
                Live Queue
              </span>
            </div>

            <div className="space-y-3">
              {patientsList.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedPatient.id === patient.id
                      ? "bg-[#1C1B18] text-white border-[#1C1B18] shadow-sm"
                      : "bg-[#FAF6E8]/70 hover:bg-[#FAF6E8] text-[#1C1B18] border-[#E3DAC4]"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{patient.name}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        patient.status.includes("Verified")
                          ? "bg-green-500/20 text-green-700 dark:text-green-300"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {patient.status}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-1">
                    {patient.age} y/o {patient.gender} • {patient.id}
                  </div>
                  <div className="text-[10px] opacity-90 mt-1 font-serif">
                    {patient.condition}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Patient Details & AI Discussion Workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Patient Header Card */}
            <div className="bg-white border border-[#E3DAC4] p-5 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EBE6D8] pb-3">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#1C1B18]">
                    {selectedPatient.name}
                  </h3>
                  <p className="text-xs text-[#787363]">
                    ID: {selectedPatient.id} • {selectedPatient.age} y/o {selectedPatient.gender}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#E6F5EE] border border-[#B2E6CF] text-[#1E734C] px-3 py-1 rounded-full font-bold">
                    {selectedPatient.condition}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#423E34]">
                <span className="font-bold text-[#1C1B18]">AI Drafted Recommendation:</span>
                <p className="p-3 bg-[#FAF6E8] border border-[#E8DAA8] rounded-xl font-sans">
                  {selectedPatient.aiRec}
                </p>
              </div>
            </div>

            {/* Doctor-AI Discussion Panel */}
            <div className="bg-white border border-[#E3DAC4] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#EBE6D8] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1C5396] flex items-center gap-2">
                  <MaterialIcon name="chat" className="text-base text-[#1C5396]" />
                  Discuss Recommendation with Hippo AI
                </span>
                <span className="text-[10px] bg-[#E8F2FC] text-[#1C5396] px-2.5 py-0.5 rounded-full font-bold">
                  Clinical RAG Co-Pilot
                </span>
              </div>

              {/* Discussion Thread */}
              <div className="h-44 overflow-y-auto space-y-3 p-3 bg-[#F6F4EF] rounded-xl border border-[#E3DAC4]">
                {discussionHistory.map((d, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col text-xs p-3 rounded-xl ${
                      d.sender === "doctor"
                        ? "bg-[#1C5396] text-white self-end border border-[#154178]"
                        : "bg-white text-[#1C1B18] border border-[#E3DAC4]"
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80 uppercase mb-0.5">
                      {d.sender === "doctor" ? "Dr. Sarah Chen, MD" : "Hippo AI Copilot"}
                    </span>
                    <p className="leading-relaxed">{d.text}</p>
                  </div>
                ))}
              </div>

              {/* Discussion Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={discussionInput}
                  onChange={(e) => setDiscussionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendDiscussion()}
                  placeholder="Ask AI Copilot for clinical reasoning or request draft edit..."
                  className="flex-1 bg-[#F6F4EF] border border-[#E3DAC4] rounded-xl px-4 py-2.5 text-xs text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#1C5396]"
                />
                <button
                  onClick={handleSendDiscussion}
                  className="bg-[#1C5396] hover:bg-[#154178] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Discuss
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

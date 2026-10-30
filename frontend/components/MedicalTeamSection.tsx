"use client";

import React, { useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import ScrollFloat from "@/components/ui/ScrollFloat";

const doctors = [
  {
    name: "Dr. Sarah Chen, MD",
    title: "Chief Medical AI Officer",
    sub: "Harvard Medical • Internal Medicine",
    bgColor: "bg-[#FBEBF2]",
    borderColor: "border-[#F5C4DB]",
    badgeColor: "bg-[#942A5C] text-white",
    avatarBg: "bg-[#F7D6E6]",
    specialty: "Clinical AI & Cardiology",
  },
  {
    name: "Dr. Marcus Vance, MD",
    title: "Lead Radiologist & Imaging AI",
    sub: "Johns Hopkins • Diagnostic Radiology",
    bgColor: "bg-[#E8F2FC]",
    borderColor: "border-[#B5D5F5]",
    badgeColor: "bg-[#1C5396] text-white",
    avatarBg: "bg-[#D4E6F8]",
    specialty: "Chest X-Ray & YOLOv11 Engine",
  },
  {
    name: "Dr. Elena Rostova, MD, PhD",
    title: "Head of Neuro-Oncology",
    sub: "Stanford Medicine • Neurosurgery",
    bgColor: "bg-[#E6F5EE]",
    borderColor: "border-[#B2E6CF]",
    badgeColor: "bg-[#1E734C] text-white",
    avatarBg: "bg-[#D1EFE4]",
    specialty: "Brain MRI & Tumor AI",
  },
  {
    name: "Dr. James Wilson, MD",
    title: "Dermatology & Oncology Specialist",
    sub: "UCSF Health • Dermatoscope Vision",
    bgColor: "bg-[#FAF2D6]",
    borderColor: "border-[#E8DAA8]",
    badgeColor: "bg-[#6B571B] text-white",
    avatarBg: "bg-[#F5E8B8]",
    specialty: "Skin Lesions & Melanoma Classifier",
  },
];

export function MedicalTeamSection() {
  const [activeIdx, setActiveIdx] = useState(0);

  const handlePrev = () => {
    setActiveIdx((prev) => (prev === 0 ? doctors.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev === doctors.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="medical-team" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Header (Matches "MEET OUR DOCTORS / Discover Our Team of Dental Experts" in reference image) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-3">
          <span className="text-xs font-bold tracking-widest text-[#787363] uppercase">
            MEET OUR DOCTORS
          </span>
          <ScrollFloat
            as="h2"
            animationDuration={1}
            ease="back.inOut(2)"
            stagger={0.03}
            containerClassName="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#1C1B18] tracking-tight"
          >
            Discover Our Team of <span className="text-[#8C6B1F]">Health Experts</span>
          </ScrollFloat>
          <p className="text-sm sm:text-base text-[#595446] font-sans max-w-lg">
            Board-certified physicians, radiologists, and oncologists validating every AI engine for patient safety.
          </p>
        </div>

        {/* Carousel Arrow Controls (Matches top right < > in reference image) */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="w-12 h-12 rounded-full border border-[#DCD5C5] bg-white flex items-center justify-center text-[#1C1B18] hover:bg-[#FAF6E8] transition-colors shadow-2xs"
            aria-label="Previous Doctor"
          >
            <MaterialIcon name="chevron_left" className="text-2xl text-[#1C1B18]" />
          </button>
          <button
            onClick={handleNext}
            className="w-12 h-12 rounded-full bg-[#1C1B18] text-white flex items-center justify-center hover:bg-[#33312B] transition-colors shadow-2xs"
            aria-label="Next Doctor"
          >
            <MaterialIcon name="chevron_right" className="text-2xl text-white" />
          </button>
        </div>
      </div>

      {/* Grid of Doctor Cards with colored background frames (Matches reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {doctors.map((doc, idx) => (
          <div
            key={idx}
            className={`rounded-[32px] p-6 border ${doc.borderColor} ${doc.bgColor} flex flex-col justify-between space-y-6 transition-transform hover:-translate-y-1.5 shadow-xs`}
          >
            {/* Top Color Portrait Frame */}
            <div className={`w-full h-64 rounded-[24px] ${doc.avatarBg} border border-white/80 flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner`}>
              <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-3">
                <MaterialIcon name="stethoscope" className="text-4xl text-[#1C1B18]" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${doc.badgeColor} shadow-2xs`}>
                {doc.specialty}
              </span>
            </div>

            {/* Doctor Info */}
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-[#1C1B18] tracking-tight">
                {doc.name}
              </h3>
              <p className="text-xs font-bold text-[#4D493E]">
                {doc.title}
              </p>
              <p className="text-[11px] text-[#787363] font-medium">
                {doc.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}

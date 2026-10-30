"use client";

import React from "react";
import ScrollVelocity from "@/components/ScrollVelocity";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const features = [
  { text: "AI Medical Chatbot & RAG", icon: "smart_toy" },
  { text: "Doctor-Verified AI Recommendations", icon: "verified" },
  { text: "Google Health Smartwatch Sync", icon: "watch" },
  { text: "2D Human Anatomy Viewer", icon: "visibility" },
  { text: "Chest X-Ray YOLOv11 & TorchXRayVision", icon: "radiology" },
  { text: "Universal Bone Fracture Localization", icon: "healing" },
  { text: "Cardiovascular Risk XGBoost Engine", icon: "favorite" },
  { text: "Brain Tumor MRI Lesion Detection", icon: "psychology" },
  { text: "Skin Allergy & Dermatoscope AI", icon: "medical_information" },
  { text: "Clinical Patient Management Suite", icon: "assignment" },
];

export function MarqueeTicker() {
  const marqueeContent = (
    <span className="inline-flex items-center">
      {features.map((item, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-3 px-8 font-medium tracking-wide text-[#38352E] text-2xl sm:text-3xl md:text-4xl select-none"
        >
          <MaterialIcon name={item.icon} className="text-2xl sm:text-3xl md:text-4xl text-[#8C6B1F]" />
          <span>{item.text}</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="w-full bg-[#F6F4EF] py-6 border-y border-[#E6E1D3] overflow-hidden my-4">
      <ScrollVelocity
        texts={[marqueeContent]}
        velocity={160}
        numCopies={4}
      />
    </div>
  );
}



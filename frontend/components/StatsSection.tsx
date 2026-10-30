"use client";

import React from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const stats = [
  {
    iconName: "groups",
    value: "10k+",
    label: "Patients & Clinics",
    sub: "Supported Worldwide",
  },
  {
    iconName: "workspace_premium",
    value: "99.2%",
    label: "Diagnostic Accuracy",
    sub: "Doctor-Validated AI Score",
  },
  {
    iconName: "memory",
    value: "10+",
    label: "Clinical AI Engines",
    sub: "RAG, YOLOv11 & XGBoost",
  },
  {
    iconName: "stethoscope",
    value: "60+",
    label: "Expert Doctors",
    sub: "Physicians & Radiologists",
  },
];

export function StatsSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-b border-[#E6E1D3]">
        {stats.map((stat, index) => {
          return (
            <div
              key={index}
              className="flex flex-col items-center text-center space-y-2 group p-4 rounded-2xl hover:bg-[#FAF6E8] transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E3DAC4] shadow-2xs flex items-center justify-center text-[#1C1B18] group-hover:scale-110 group-hover:bg-[#FAF6E8] transition-all">
                <MaterialIcon name={stat.iconName} className="text-2xl text-[#8C6B1F]" />
              </div>
              <span className="font-serif text-4xl sm:text-5xl font-bold text-[#1C1B18] tracking-tight pt-1">
                {stat.value}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#38352E] font-sans">
                  {stat.label}
                </span>
                <span className="text-xs text-[#787363] font-medium">
                  {stat.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

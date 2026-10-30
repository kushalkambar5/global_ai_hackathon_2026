"use client";

import React from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import ScrollFloat from "@/components/ui/ScrollFloat";

const coreServices = [
  {
    id: "chatbot",
    title: "AI Medical Chatbot & RAG",
    subtitle: "Conversational Intelligence",
    description:
      "Context-aware medical Q&A with RAG memory, medical knowledge base, report upload support, voice input & instant symptom guidance.",
    bgColor: "bg-[#FAF2D6]",
    borderColor: "border-[#E8DAA8]",
    textColor: "text-[#594918]",
    badgeBg: "bg-white/80 text-[#6B571B]",
    iconName: "chat",
    bullets: ["Medical Q&A", "Report Upload", "Voice Input", "Context Memory"],
  },
  {
    id: "doctor",
    title: "Doctor-Verified AI Plans",
    subtitle: "Human-in-the-Loop Clinical Care",
    description:
      "Patients connect seamlessly with doctors. AI generates baseline recommendations, and certified doctors review, modify, and verify final care plans.",
    bgColor: "bg-[#E8F2FC]",
    borderColor: "border-[#B5D5F5]",
    textColor: "text-[#18467A]",
    badgeBg: "bg-white/80 text-[#1C5396]",
    iconName: "stethoscope",
    bullets: ["Doctor Connection", "AI Recommendations", "Clinical Edits", "Final Verification"],
  },
  {
    id: "smartwatch",
    title: "Smartwatch Integration",
    subtitle: "Google Health API Engine",
    description:
      "Live sync for Heart Rate, SpO₂, Sleep, Steps, and Calories. AI produces personalized diet plans, activity recommendations & recovery insights.",
    bgColor: "bg-[#E6F5EE]",
    borderColor: "border-[#B2E6CF]",
    textColor: "text-[#155939]",
    badgeBg: "bg-white/80 text-[#1E734C]",
    iconName: "watch",
    bullets: ["Biometric Sync", "SpO₂ & Sleep", "AI Diet Planner", "Tracking Dashboard"],
  },
  {
    id: "anatomy",
    title: "2D Human Anatomy Viewer",
    subtitle: "Interactive Organ Explorer",
    description:
      "Full 2D visualization of human body systems. Highlight diseased organs, affected body parts, symptom clinical explanations & patient education tools.",
    bgColor: "bg-[#FBEBF2]",
    borderColor: "border-[#F5C4DB]",
    textColor: "text-[#751B47]",
    badgeBg: "bg-white/80 text-[#942A5C]",
    iconName: "visibility",
    bullets: ["2D Body Systems", "Diseased Organ Heatmap", "Symptom Map", "Doctor Educational Tool"],
  },
];

export function CoreServicesGrid() {
  return (
    <section id="core-services" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
      
      {/* Section Header (Matches "Our core dental services" in reference image) */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
        
        <ScrollFloat
          as="h2"
          animationDuration={1}
          ease="back.inOut(2)"
          stagger={0.03}
          containerClassName="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#1C1B18] tracking-tight"
        >
          Our core <span className="text-[#8C6B1F]">medical</span> services
        </ScrollFloat>
        <p className="text-base text-[#615C4F] font-sans">
          Four foundational pillars engineered to unite artificial intelligence with physician oversight and patient biometrics.
        </p>
      </div>

      {/* 4 Colored Cards Grid (Matching reference image pastel grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {coreServices.map((service) => {
          return (
            <div
              key={service.id}
              className={`relative rounded-[32px] p-7 ${service.bgColor} border ${service.borderColor} flex flex-col justify-between h-[440px] transition-all hover:-translate-y-1 hover:shadow-lg group`}
            >
              {/* Top Header inside card */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${service.badgeBg}`}>
                    {service.subtitle}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white/90 shadow-2xs flex items-center justify-center text-[#1C1B18]">
                    <MaterialIcon name={service.iconName} className="text-xl" />
                  </div>
                </div>

                <h3 className="font-serif text-2xl font-bold text-[#1C1B18] tracking-tight mb-3">
                  {service.title}
                </h3>

                <p className="text-xs font-sans text-[#423E34] leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              {/* Bullets List & Bottom Action Arrow */}
              <div>
                <div className="space-y-1.5 mb-6 pt-4 border-t border-black/5">
                  {service.bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-[#2E2B24]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1C1B18]/70" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Circle Arrow Button (Matches reference image corner circle) */}
                <div className="flex items-center justify-between pt-2">
                  <a
                    href="#interactive-showcase"
                    className="text-xs font-bold text-[#1C1B18] group-hover:underline flex items-center gap-1"
                  >
                    <span>EXPLORE ENGINE</span>
                  </a>
                  <a
                    href="#interactive-showcase"
                    className="w-10 h-10 rounded-full bg-[#1C1B18] text-white flex items-center justify-center group-hover:bg-[#8C6B1F] group-hover:scale-105 transition-all shadow-sm"
                    aria-label={`Explore ${service.title}`}
                  >
                    <MaterialIcon name="arrow_outward" className="text-lg text-white" />
                  </a>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}

"use client";

import React, { useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import ScrollFloat from "@/components/ui/ScrollFloat";

const reviews = [
  {
    category: "Chest X-Ray AI",
    badgeBg: "bg-[#FAF2D6] text-[#6B571B]",
    quote:
      "I was nervous after receiving a routine X-ray, but Hippo Health's YOLOv11 engine localized the nodule instantly, and Dr. Vance reviewed and confirmed it within minutes. Unbelievable peace of mind.",
    author: "Guy Hawkins",
    role: "Verified Patient",
    rating: 5,
  },
  {
    category: "Smartwatch Health Sync",
    badgeBg: "bg-[#E8F2FC] text-[#1C5396]",
    quote:
      "Syncing my Google Health API smartwatch data changed my daily routine. The AI diet and recovery insights kept my blood pressure in check, and my doctor monitors my weekly trends directly.",
    author: "Jacob Jones",
    role: "Marathon Runner",
    rating: 5,
  },
  {
    category: "2D Human Anatomy",
    badgeBg: "bg-[#E6F5EE] text-[#1E734C]",
    quote:
      "As a physician, using the 2D Anatomy Viewer during consultations helps my patients visually grasp their condition far better than static diagrams. A game-changer for medical communication.",
    author: "Dr. Robert Fox",
    role: "Clinical Specialist",
    rating: 5,
  },
  {
    category: "Cardiovascular XGBoost",
    badgeBg: "bg-[#FBEBF2] text-[#942A5C]",
    quote:
      "The cardiovascular risk predictor flagged my elevated cholesterol before symptoms appeared. The doctor-approved prevention plan lowered my risk by 22% in 90 days.",
    author: "Eleanor Pena",
    role: "Verified Patient",
    rating: 5,
  },
];

export function ReviewsSection() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section id="reviews" className="w-full bg-[#FAF6E8] py-20 border-y border-[#EDE4CD] my-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header (Matches "1800+ Reviews" in reference image) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="text-xs font-bold tracking-widest text-[#787363] uppercase">
              PATIENT & CLINICIAN FEEDBACK
            </span>
            <ScrollFloat
              as="h2"
              animationDuration={1}
              ease="back.inOut(2)"
              stagger={0.03}
              containerClassName="font-serif text-5xl sm:text-6xl font-normal text-[#1C1B18] tracking-tight"
            >
              1800+ <span className="text-[#8C6B1F]">Reviews</span>
            </ScrollFloat>
            <p className="text-sm sm:text-base text-[#595446] font-sans max-w-md">
              Real experiences from patients and physicians using Hippo Health for precision AI care.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveIdx((prev) => (prev === 0 ? reviews.length - 1 : prev - 1))}
              className="w-12 h-12 rounded-full border border-[#DCD5C5] bg-white flex items-center justify-center text-[#1C1B18] hover:bg-[#F4E071] transition-colors shadow-2xs"
              aria-label="Previous Review"
            >
              <MaterialIcon name="chevron_left" className="text-2xl text-[#1C1B18]" />
            </button>
            <button
              onClick={() => setActiveIdx((prev) => (prev === reviews.length - 1 ? 0 : prev + 1))}
              className="w-12 h-12 rounded-full bg-[#1C1B18] text-white flex items-center justify-center hover:bg-[#33312B] transition-colors shadow-2xs"
              aria-label="Next Review"
            >
              <MaterialIcon name="chevron_right" className="text-2xl text-white" />
            </button>
          </div>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((rev, i) => (
            <div
              key={i}
              className="bg-white border border-[#E3DAC4] rounded-[28px] p-6 space-y-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${rev.badgeBg}`}>
                  {rev.category}
                </span>

                <p className="text-xs text-[#38352E] font-sans leading-relaxed">
                  &quot;{rev.quote}&quot;
                </p>
              </div>

              <div className="pt-4 border-t border-[#F0EBE0] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#1C1B18]">
                    {rev.author}
                  </h4>
                  <span className="text-[10px] text-[#787363]">
                    {rev.role}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-[#C49A24]">
                  {[...Array(rev.rating)].map((_, s) => (
                    <MaterialIcon key={s} name="star" className="text-sm text-[#C49A24]" fill />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

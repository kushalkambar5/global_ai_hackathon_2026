"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function InteractiveFeatureShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxScrollX, setMaxScrollX] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  // Setup vertical-to-horizontal scroll driver
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Calculate maximum X offset for responsive horizontal scrolling
  useEffect(() => {
    const calculateWidth = () => {
      if (trackRef.current) {
        const totalTrackWidth = trackRef.current.scrollWidth;
        const visibleWidth = window.innerWidth;
        const maxScroll = totalTrackWidth - visibleWidth;
        setMaxScrollX(maxScroll > 0 ? maxScroll : 0);
      }
    };

    calculateWidth();
    window.addEventListener("resize", calculateWidth);
    return () => window.removeEventListener("resize", calculateWidth);
  }, []);

  const x = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 0, -maxScrollX, -maxScrollX]);

  // Sync active tab state with scroll progress
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.20) setActiveStep(0);
    else if (latest < 0.50) setActiveStep(1);
    else if (latest < 0.80) setActiveStep(2);
    else setActiveStep(3);
  });

  // Smooth scroll page to the target feature slide
  const scrollToStep = (index: number) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const sectionTop = rect.top + scrollTop;
    const sectionHeight = sectionRef.current.offsetHeight - window.innerHeight;

    // Target position corresponding to step keyframes (0.05 to 0.95)
    const targetProgress = 0.05 + (index / 3) * 0.90;
    const stepTarget = sectionTop + targetProgress * sectionHeight;
    window.scrollTo({
      top: stepTarget,
      behavior: "smooth",
    });
  };

  const stepsInfo = [
    { title: "1. AI Medical Chatbot", icon: "chat", color: "text-[#8C6B1F]" },
    { title: "2. Doctor-Verified AI", icon: "stethoscope", color: "text-[#1C5396]" },
    { title: "3. Smartwatch Sync", icon: "watch", color: "text-[#1E734C]" },
    { title: "4. 2D Anatomy Viewer", icon: "visibility", color: "text-[#942A5C]" },
  ];

  return (
    <section
      ref={sectionRef}
      id="interactive-showcase"
      className="relative h-[450vh] sm:h-[500vh] bg-[#F6F4EF]"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        
        {/* Header and Step Controls */}
        <div className="w-full max-w-7xl mx-auto space-y-3 shrink-0 pt-2">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1C1B18] tracking-tight">
              Experience Hippo Health <span className="text-[#8C6B1F]">Live</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#595446] font-sans max-w-xl mx-auto">
              Scroll down to explore interactive AI medical chatbots, doctor verification, smartwatch sync, and 2D organ modeling in horizontal motion.
            </p>
          </div>

          {/* Interactive Step Navigator Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {stepsInfo.map((step, idx) => (
              <button
                key={idx}
                onClick={() => scrollToStep(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  activeStep === idx
                    ? "bg-[#1C1B18] text-white border-[#1C1B18] shadow-md scale-105"
                    : "bg-white text-[#4D493E] border-[#E3DAC4] hover:bg-[#FAF6E8]"
                }`}
              >
                <MaterialIcon name={step.icon} className={`text-sm ${activeStep === idx ? "text-[#F4E071]" : step.color}`} />
                <span>{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Track Viewport */}
        <div className="w-full overflow-hidden my-auto py-2">
          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex items-center gap-6 sm:gap-10 px-4 sm:px-12 w-max"
          >
            {/* PART 1: AI MEDICAL CHATBOT */}
            <div className="relative h-[48vh] sm:h-[52vh] lg:h-[56vh] max-h-[520px] aspect-[1672/941] shrink-0 bg-white border border-[#E6E1D3] rounded-[28px] sm:rounded-[36px] p-2 sm:p-3 shadow-lg overflow-hidden">
              <div className="relative w-full h-full rounded-[20px] sm:rounded-[28px] overflow-hidden">
                <Image
                  src="/homepage_images/chatbot.png"
                  alt="Hippo AI Medical Assistant & RAG Engine"
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* PART 2: DOCTOR-VERIFIED AI */}
            <div className="relative h-[48vh] sm:h-[52vh] lg:h-[56vh] max-h-[520px] aspect-[1672/941] shrink-0 bg-white border border-[#E6E1D3] rounded-[28px] sm:rounded-[36px] p-2 sm:p-3 shadow-lg overflow-hidden">
              <div className="relative w-full h-full rounded-[20px] sm:rounded-[28px] overflow-hidden">
                <Image
                  src="/homepage_images/doctor_and_patient.png"
                  alt="Doctor Verification & Clinical Co-Pilot Studio"
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* PART 3: SMARTWATCH SYNC */}
            <div className="relative h-[48vh] sm:h-[52vh] lg:h-[56vh] max-h-[520px] aspect-[1672/941] shrink-0 bg-white border border-[#E6E1D3] rounded-[28px] sm:rounded-[36px] p-2 sm:p-3 shadow-lg overflow-hidden">
              <div className="relative w-full h-full rounded-[20px] sm:rounded-[28px] overflow-hidden">
                <Image
                  src="/homepage_images/smart_watch.png"
                  alt="Smartwatch Integration & Google Health API Engine"
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* PART 4: 2D HUMAN ANATOMY VIEWER */}
            <div className="relative h-[48vh] sm:h-[52vh] lg:h-[56vh] max-h-[520px] aspect-[1672/941] shrink-0 bg-white border border-[#E6E1D3] rounded-[28px] sm:rounded-[36px] p-2 sm:p-3 shadow-lg overflow-hidden">
              <div className="relative w-full h-full rounded-[20px] sm:rounded-[28px] overflow-hidden">
                <Image
                  src="/homepage_images/humanbody.png"
                  alt="2D Human Anatomy & Organ Disease Visualizer"
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                />
              </div>
            </div>

          </motion.div>
        </div>

        {/* Bottom Horizontal Progress Bar Indicator */}
        <div className="w-full max-w-xl mx-auto space-y-2 shrink-0 pb-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#787363]">
            <span>Part {activeStep + 1} of 4</span>
            <span className="hidden sm:inline-block text-[#8C6B1F]">
              Scroll down to navigate horizontally →
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#E6E1D3] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#1C1B18] rounded-full"
              style={{
                width: useTransform(scrollYProgress, [0, 1], ["25%", "100%"]),
              }}
            />
          </div>
        </div>

      </div>
    </section>
  );
}

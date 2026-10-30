"use client";

import React, { type MouseEvent, useRef, useState } from "react";
import { motion, useSpring } from "motion/react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import ScrollFloat from "@/components/ui/ScrollFloat";

interface ImageItem {
  img: string;
  label: string;
  tag: string;
}

export function DiagnosticSuiteDark() {
  const list: ImageItem[] = [
    {
      img: "/homepage_images/chest.png",
      label: "Chest X-Ray Analysis",
      tag: "Computer Vision",
    },
    {
      img: "/homepage_images/ecg.png",
      label: "ECG & Heart Arrhythmia AI",
      tag: "Signal Processing",
    },
    {
      img: "/homepage_images/bone.png",
      label: "Bone Fracture Detection",
      tag: "Deep Learning",
    },
    {
      img: "/homepage_images/heart_xgboost.png",
      label: "Cardiovascular Risk AI",
      tag: "XGBoost ML",
    },
    {
      img: "/homepage_images/brain.png",
      label: "Brain Tumor MRI Detection",
      tag: "Neural Networks",
    },
    {
      img: "/homepage_images/skin.png",
      label: "Skin Allergy Classifier",
      tag: "Image Classification",
    },
  ];

  const [img, setImg] = useState<{ src: string; alt: string; opacity: number }>({
    src: list[0].img,
    alt: list[0].label,
    opacity: 0,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const spring = {
    stiffness: 150,
    damping: 15,
    mass: 0.1,
  };

  const imagePos = {
    x: useSpring(0, spring),
    y: useSpring(0, spring),
  };

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const { clientX, clientY } = e;
    
    const relativeX = clientX - containerRect.left;
    const relativeY = clientY - containerRect.top;

    imagePos.x.set(relativeX - imageRef.current.offsetWidth / 2);
    imagePos.y.set(relativeY - imageRef.current.offsetHeight / 2);
  };

  const handleImageInteraction = (item: ImageItem, opacity: number) => {
    setImg({ src: item.img, alt: item.label, opacity });
  };

  return (
    <section id="diagnostic-suite" className="w-full bg-[#1C1B18] text-white py-20 my-12 border-y border-[#33312B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header (Matches "Our Featured Product" in reference image) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#33312B] pb-8">
          <div className="space-y-3">
            <ScrollFloat
              as="h2"
              animationDuration={1}
              ease="back.inOut(2)"
              stagger={0.03}
              containerClassName="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-white tracking-tight"
            >
              Our Advanced <span className="text-[#F4E071]">AI Diagnostic</span> Suite
            </ScrollFloat>
            <p className="text-sm sm:text-base text-[#AAA595] font-sans max-w-xl">
              High-precision computer vision, XGBoost risk stratification, and neural network classification models engineered for clinical decision support.
            </p>
          </div>

          <a
            href="#interactive-showcase"
            className="inline-flex items-center gap-2 bg-[#F4E071] hover:bg-[#E8C838] text-[#1C1B18] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all self-start md:self-end"
          >
            <span>EXPLORE DIAGNOSTICS</span>
            <MaterialIcon name="chevron_right" className="text-base text-[#1C1B18]" />
          </a>
        </div>

        {/* 6 Clinical AI Engine List with Hover Image Reveal */}
        <div 
          ref={containerRef} 
          onMouseMove={handleMove} 
          className="relative w-full border-t border-[#33312B] mt-8"
        >
          {list.map((item) => (
            <div
              key={item.label}
              onMouseEnter={() => handleImageInteraction(item, 1)}
              onMouseMove={() => handleImageInteraction(item, 1)}
              onMouseLeave={() => handleImageInteraction(item, 0)}
              className="w-full py-6 cursor-pointer flex justify-between items-center border-b border-[#33312B] last:border-none group transition-all duration-300"
            >
              <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-[#FAF6E8] group-hover:text-[#F4E071] transition-colors duration-300">
                {item.label}
              </p>
              <span className="flex items-center gap-2 text-xs sm:text-sm font-sans uppercase tracking-wider text-[#AAA595] group-hover:text-white transition-colors duration-300">
                {item.tag}{" "}
                <span className="w-2.5 h-2.5 bg-[#F4E071] inline-block transition-transform duration-300 group-hover:rotate-45"></span>
              </span>
            </div>
          ))}

          <motion.img
            ref={imageRef}
            src={img.src}
            alt={img.alt}
            className="w-[320px] h-[220px] rounded-2xl object-cover absolute top-0 left-0 border border-[#3A3831] shadow-2xl z-30 pointer-events-none transition-opacity duration-200 ease-in-out"
            style={{
              x: imagePos.x,
              y: imagePos.y,
              opacity: img.opacity,
            }}
          />
        </div>

      </div>
    </section>
  );
}

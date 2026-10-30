import React from "react";
import { HeaderNav } from "@/components/HeaderNav";
import { HeroSection } from "@/components/HeroSection";
import { MarqueeTicker } from "@/components/MarqueeTicker";
import { CoreServicesGrid } from "@/components/CoreServicesGrid";
import Strands from "@/components/Strands";
import { InteractiveFeatureShowcase } from "@/components/InteractiveFeatureShowcase";
import { DiagnosticSuiteDark } from "@/components/DiagnosticSuiteDark";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18] selection:bg-[#F4E071] selection:text-[#1C1B18]">
      {/* Navigation Header */}
      <HeaderNav />

      {/* Main Content Sections */}
      <main className="flex-1 w-full overflow-x-clip">
        {/* Hero Section with Soft Butter Yellow Container Card */}
        <HeroSection />

        {/* Marquee Feature Highlights Ticker */}
        <MarqueeTicker />

        {/* 4 Pastel Core Medical Services Cards */}
        <CoreServicesGrid />

        {/* Full-width Strands Component seamlessly integrated */}
        <div className="w-full h-[260px] sm:h-[320px] lg:h-[380px] relative overflow-hidden pointer-events-none">
          <Strands
            colors={["#F97316", "#7C3AED", "#06B6D4"]}
            count={4}
            speed={0.4}
            amplitude={0.5}
            waviness={1.9}
            thickness={0.7}
            glow={1.8}
            taper={0.5}
            spread={0}
            intensity={0.7}
            saturation={1.5}
            opacity={1}
            scale={2.2}
            glass={false}
            refraction={1}
            dispersion={1}
            glassSize={1}
          />
        </div>

        {/* Live Interactive Tabbed Feature Showcase */}
        <InteractiveFeatureShowcase />

        {/* Dark Graphite Diagnostic AI Suite Section */}
        <DiagnosticSuiteDark />
      </main>

      {/* Comprehensive Footer */}
      <Footer />
    </div>
  );
}

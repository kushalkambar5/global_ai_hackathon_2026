"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import ScrollFloat from "@/components/ui/ScrollFloat";
import SpecularButton from "@/components/SpecularButton";
import { useSession } from "next-auth/react";

export function HeroSection() {
  const { data: session, status } = useSession();

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6 relative z-10">
      {/* Main Soft Yellow Container Card */}
      <div className="relative w-full bg-[#FAF6E8] rounded-[36px] p-6 sm:p-8 lg:p-12 overflow-hidden shadow-xs">
        
        {/* Background Subtle Gradient Blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#F4E071]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#D4E6F8]/40 rounded-full blur-3xl pointer-events-none font-sans" />

        <div className="max-w-3xl flex flex-col space-y-6 sm:space-y-8 relative z-10 py-4">
          {/* Editorial Serif Headline (Matches Reference Image Style) */}
          <ScrollFloat
            as="h1"
            animationDuration={1}
            ease="back.inOut(2)"
            stagger={0.03}
            containerClassName="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#1C1B18] tracking-tight leading-[1.08]"
          >
            AI Powered <span className="text-[#8C6B1F]">Health</span><br />For Everyone.
          </ScrollFloat>

          {/* Supporting Subtitle */}
          <p className="text-base sm:text-lg text-[#524E43] font-sans font-normal max-w-2xl leading-relaxed">
            A modern way to keep track of your health and wellness, with AI-powered insights and recommendations. You can also scan your medical reports, scans etc.
          </p>

          {/* Primary Action & Avatar Proof Stack */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {status === "authenticated" ? (
              <SpecularButton
                href="/dashboard"
                size="custom"
                radius={9999}
                tint="#1C1B18"
                tintOpacity={1}
                textColor="#ffffff"
                lineColor="#ffffff"
                baseColor="#525252"
                intensity={1.2}
                shineSize={12}
                shineFade={35}
                thickness={1.5}
                speed={0.4}
                followMouse={true}
                proximity={300}
                className="px-7 py-4 text-xs font-bold tracking-wider uppercase shadow-md group font-sans"
              >
                <span>Go to Dashboard</span>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <MaterialIcon name="arrow_forward" className="text-sm text-white" />
                </span>
              </SpecularButton>
            ) : (
              <>
                <SpecularButton
                  href="/signup"
                  size="custom"
                  radius={9999}
                  tint="#1C1B18"
                  tintOpacity={1}
                  textColor="#ffffff"
                  lineColor="#ffffff"
                  baseColor="#525252"
                  intensity={1.2}
                  shineSize={12}
                  shineFade={35}
                  thickness={1.5}
                  speed={0.4}
                  followMouse={true}
                  proximity={300}
                  className="px-7 py-4 text-xs font-bold tracking-wider uppercase shadow-md group font-sans"
                >
                  <span>Get Started</span>
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <MaterialIcon name="arrow_forward" className="text-sm text-white" />
                  </span>
                </SpecularButton>

                <Link
                  href="/login"
                  className="px-7 py-4 text-xs font-bold tracking-wider uppercase rounded-full border border-[#1C1B18]/20 bg-white/70 hover:bg-white text-[#1C1B18] transition-all shadow-xs hover:shadow-md flex items-center gap-2 font-sans group active:scale-95"
                >
                  <span>Sign In</span>
                  <MaterialIcon name="login" className="text-sm text-[#1C1B18] group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}


"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import DiseaseDetector from "@/components/dashboard/DiseaseDetector";

export default function DetectDiseasePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session && !session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
        <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-[#787363]">Loading...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-[#F6F4EF] text-[#1C1B18] overflow-hidden">
      <HeaderNav />
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col">
        <DiseaseDetector />
      </main>
    </div>
  );
}

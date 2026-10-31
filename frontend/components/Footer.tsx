"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useSession } from "next-auth/react";

export function Footer() {
  const { data: session, status } = useSession();

  // If the user is signed in, do not display the footer
  if (status === "authenticated") {
    return null;
  }

  return (
    <footer className="w-full bg-[#1C1B18] text-white pt-16 pb-12 border-t border-[#33312B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#FAF6E8] p-1 border border-[#E8E2CF]">
                <Image
                  src="/logo.png"
                  alt="Hippo Health Logo"
                  fill
                  sizes="40px"
                  className="object-contain p-1"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-tight text-white leading-none">
                  Hippo<span className="text-[#F4E071]">Health</span>
                </span>
                <span className="text-[10px] font-sans font-medium tracking-widest text-[#AAA595] uppercase mt-0.5">
                  Precision Clinical AI
                </span>
              </div>
            </Link>

            <p className="text-xs text-[#AAA595] leading-relaxed max-w-sm">
              Hippo Health combines RAG medical chatbots, smartwatch telemetry, 2D anatomical modeling, and 6 specialized clinical AI diagnostic engines with mandatory physician oversight.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#F4E071]">
              <MaterialIcon name="verified_user" className="text-base text-[#F4E071]" />
              <span>HIPAA & GDPR Compliant Medical Architecture</span>
            </div>
          </div>

          {/* Nav Links Column 1 */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4E071]">
              Clinical Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-[#AAA595]">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  My Clinical Dashboard
                </Link>
              </li>
              <li>
                <Link href="/chat-with-hippo" className="hover:text-white transition-colors">
                  AI Medical Chatbot (Hippo Chat)
                </Link>
              </li>
              <li>
                <Link href="/visualize-body" className="hover:text-white transition-colors">
                  2D Human Anatomy Viewer
                </Link>
              </li>
              <li>
                <Link href="/health-metrics" className="hover:text-white transition-colors">
                  Smartwatch Telemetry Sync
                </Link>
              </li>
              <li>
                <Link href="/medical-history" className="hover:text-white transition-colors">
                  Medical History Repository
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Links Column 2 */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4E071]">
              Diagnostic Suite
            </h4>
            <ul className="space-y-2.5 text-xs text-[#AAA595]">
              <li>
                <Link href="/detect-disease?model=chest" className="hover:text-white transition-colors">
                  Chest Pathology AI
                </Link>
              </li>
              <li>
                <Link href="/detect-disease?model=bone" className="hover:text-white transition-colors">
                  Bone Fracture AI
                </Link>
              </li>
              <li>
                <Link href="/detect-disease?model=ecg" className="hover:text-white transition-colors">
                  ECG Arrhythmia AI
                </Link>
              </li>
              <li>
                <Link href="/detect-disease?model=heart" className="hover:text-white transition-colors">
                  Cardiovascular Risk AI
                </Link>
              </li>
              <li>
                <Link href="/detect-disease?model=brain" className="hover:text-white transition-colors">
                  Brain Tumor MRI AI
                </Link>
              </li>
              <li>
                <Link href="/detect-disease?model=skin" className="hover:text-white transition-colors">
                  Skin Lesion Classifier
                </Link>
              </li>
            </ul>
          </div>

          

        </div>

        {/* Emergency Medical Disclaimer Banner */}
        <div className="bg-[#252420] border border-[#3A3831] p-4 rounded-2xl text-[11px] text-[#A39E8F] leading-relaxed">
          <strong className="text-white">Medical Disclaimer:</strong> Hippo Health is a clinical decision support tool designed to assist healthcare professionals and provide personalized health guidance to patients. It does not replace emergency medical treatment. In the event of a medical emergency, call emergency services immediately.
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 border-t border-[#33312B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#787363]">
          <p>© {new Date().getFullYear()} Hippo Health Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-clinical-use" className="hover:text-white transition-colors">Terms of Clinical Use</Link>
            <Link href="/hipaa-compliance" className="hover:text-white transition-colors">HIPAA Compliance</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

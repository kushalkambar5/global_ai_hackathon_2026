"use client";

import React from "react";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function TermsOfClinicalUsePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18]">
      <HeaderNav />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        {/* Breadcrumb & Navigation Back */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#787363] hover:text-[#1C1B18] transition-colors"
          >
            <MaterialIcon name="arrow_back" className="text-sm" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Title Header Section */}
        <header className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-8 md:p-10 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-wider text-[#8C6B1F] bg-[#FAF6E8] border border-[#E6E1D3] px-3 py-1 rounded-full uppercase">
              Legal & Compliance
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1C1B18] tracking-tight">
            Terms of Clinical Use
          </h1>
          <p className="text-xs text-[#787363] font-sans flex items-center gap-2">
            <MaterialIcon name="schedule" className="text-xs" />
            <span>Effective Date: August 1, 2026</span>
            <span>•</span>
            <MaterialIcon name="gavel" className="text-xs text-amber-600" />
            <span className="text-amber-700 font-semibold">User Agreement</span>
          </p>
        </header>

        {/* Main Document Body */}
        <article className="bg-white border border-[#E6E1D3] rounded-[32px] p-8 md:p-12 shadow-2xs space-y-10 font-sans">
          
          {/* Summary / Lead Paragraph */}
          <div className="border-b border-[#F0EBE0] pb-6">
            <p className="text-sm text-[#4D493E] leading-relaxed">
              These Terms of Clinical Use govern your access to and use of Hippo Health's artificial intelligence models, clinical decision support tools, smartwatch telemetry sync systems, and physician portals. By registering or using the platform, you acknowledge and agree to these disclaimers and restrictions.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700">
                <MaterialIcon name="warning" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                1. Not for Emergency Medical Services
              </h2>
            </div>
            <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-5 rounded-2xl pl-11 relative">
              <span className="absolute left-4 top-5 material-symbols-outlined text-lg text-[#B34515]">error</span>
              <h4 className="font-serif text-xs font-bold text-[#8C2E0B] mb-1">CRITICAL EMERGENCY NOTICE</h4>
              <p className="text-[11px] leading-relaxed">
                Hippo Health is <strong>NOT</strong> an emergency services response platform. If you are experiencing a life-threatening medical emergency (such as severe chest pain, shortness of breath, sudden weakness, or active trauma), <strong>immediately call 112 / 911 or visit the nearest emergency room.</strong> Do not wait for AI scan results or chatbot replies.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                <MaterialIcon name="clinical_suite" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                2. AI Decision Support & Mandatory Physician Oversight
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Hippo Health utilizes 6 specialized clinical AI models (for Chest Pathology, Bone Fractures, ECG Arrhythmias, Cardiovascular Risk, Brain Tumor MRI, and Skin Lesions) under the following terms:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Clinical Support Tool:</strong> All evaluations, confidence scores, bounding boxes, and summaries provided by the AI are clinical decision support tools. They are designed to assist—not replace—professional medical judgment.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>No Self-Treatment:</strong> Patient users must not alter prescription regimens, take medical actions, or skip treatment based solely on AI scans or chatbot conversations. A consultation with a qualified healthcare provider is mandatory before executing treatment plans.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                <MaterialIcon name="verified_user" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                3. Physician User Representation & Account Verification
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Users registered as <strong>Doctors</strong> represent that they are active, licensed medical practitioners in good standing with their regional medical boards. They agree that:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>They assume full clinical responsibility for any medical decisions, diagnoses, or treatment prescriptions validated or suggested using the Hippo Health platform.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>They will maintain all patient credentials and onboarding metadata in strict compliance with HIPAA business associate mandates.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                <MaterialIcon name="watch" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                4. Telemetry Data Limits
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              The Smartwatch Telemetry Sync integration transfers heart rate, activity, and sleep details from consumer wearable devices. You acknowledge that:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Wearables are consumer devices, not diagnostic-grade clinical telemetry equipment. Data may contain noise, dropouts, or calibration errors.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Hippo Health is not responsible for physical device defects, syncing failures, or incorrect health readings generated by third-party fitness platforms.</span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
                <MaterialIcon name="block" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                5. Prohibited Use Cases
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              By using our service, you agree not to:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Inject malicious scripts, scrape diagnostic files, or attempt to reverse-engineer weights/biases of our proprietary clinical AI diagnostic engines.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Provide fraudulent doctor credentials or masquerade as a healthcare organization.</span>
              </li>
            </ul>
          </section>

          {/* Disclaimer Box */}
          <div className="bg-[#FAF6E8] border border-[#E6E1D3] p-6 rounded-2xl text-center space-y-3 mt-4">
            <h3 className="font-serif text-sm font-bold text-[#1C1B18]">
              Agreeing to the Terms
            </h3>
            <p className="text-xs text-[#787363] leading-relaxed max-w-lg mx-auto">
              Using the Hippo Health dashboard or chatting with Hippo Chat constitutes binding agreement to these Terms. If you do not agree, please deactivate your sync integrations and delete your account.
            </p>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}

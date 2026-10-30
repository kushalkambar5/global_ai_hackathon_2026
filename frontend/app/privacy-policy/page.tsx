"use client";

import React from "react";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-xs text-[#787363] font-sans flex items-center gap-2">
            <MaterialIcon name="schedule" className="text-xs" />
            <span>Effective Date: August 1, 2026</span>
            <span>•</span>
            <MaterialIcon name="verified" className="text-xs text-emerald-600" />
            <span className="text-emerald-700 font-semibold">HIPAA & GDPR Compliant</span>
          </p>
        </header>

        {/* Main Document Body */}
        <article className="bg-white border border-[#E6E1D3] rounded-[32px] p-8 md:p-12 shadow-2xs space-y-10 font-sans">
          
          {/* Summary / Lead Paragraph */}
          <div className="border-b border-[#F0EBE0] pb-6">
            <p className="text-sm text-[#4D493E] leading-relaxed">
              At Hippo Health, we believe that your healthcare data is your most private and valuable asset. We are committed to protecting the privacy, confidentiality, and security of all medical scans, telemetry streams, and AI clinical conversations. This Privacy Policy details how we handle information across our patient and physician portal applications.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                <MaterialIcon name="folder_shared" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                1. Information We Collect
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              We process data solely to deliver precision clinical insights and patient-doctor sync features:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Clinical Diagnostics:</strong> Image files (X-rays, MRI scans, ECG readings, skin lesion photos) uploaded to our 6 specialized AI models.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Smartwatch Telemetry:</strong> Sync-activated biometric streams including heart rate history, sleep latency, and physical activity levels.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Conversational RAG Logs:</strong> Interaction histories with our Hippo Chat Assistant to support context continuity.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>User Profile Information:</strong> Name, credential documents (for certified medical professionals), and onboarding metrics.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                <MaterialIcon name="settings_suggest" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                2. How We Use Collected Data
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Your health data is never sold, leased, or monetized. We utilize it strictly for:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Generating clinical evaluation reports and 2D visual anatomy projections.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Providing secure dashboards for physician review and verification workflows.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>Improving system response speed and training secondary clinical models (strictly using de-identified and anonymized datasets).</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <MaterialIcon name="security" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                3. Encryption & Data Security
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              We employ strict enterprise-grade security controls:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-11">
              <div className="bg-[#FAF9F5] border border-[#E6E1D3] p-4 rounded-2xl">
                <h4 className="font-serif text-xs font-bold text-[#1C1B18] mb-1">AES-256 At Rest</h4>
                <p className="text-[11px] text-[#787363] leading-relaxed">
                  Medical scans and chat history logs are encrypted using Advanced Encryption Standard (AES) with 256-bit keys before storage.
                </p>
              </div>
              <div className="bg-[#FAF9F5] border border-[#E6E1D3] p-4 rounded-2xl">
                <h4 className="font-serif text-xs font-bold text-[#1C1B18] mb-1">TLS 1.3 In Transit</h4>
                <p className="text-[11px] text-[#787363] leading-relaxed">
                  Any transmission of sensitive clinical data between user client apps and server networks is secured with Transport Layer Security (TLS 1.3).
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                <MaterialIcon name="swap_horiz" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                4. Data Sharing & Third-Parties
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Data is shared strictly within the scope of treatment and clinical platform management:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Your Authorized Physician:</strong> If you link your patient profile with a verified healthcare professional, they will have dashboard access to review scans, summaries, and telemetry streams.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Legal Requirements:</strong> We may disclose information if required under federal court subpoenas or HIPAA public health reporting statutes.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
                <MaterialIcon name="manage_accounts" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                5. Patient Rights & Data Control
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Under HIPAA and regional privacy regulations, you retain full rights regarding your data:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>Access & Export:</strong> Request a complete clinical record export of all scans, summaries, and chat history.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>Revocation:</strong> Disconnect your smartwatch telemetry sync or link with health practitioners at any time directly through settings.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>Right to Erasure:</strong> Request the deletion of your account and associated diagnostic metadata (subject to medical record retention legal obligations).</span>
              </li>
            </ul>
          </section>

          {/* Contact Banner */}
          <div className="bg-[#FAF6E8] border border-[#E6E1D3] p-6 rounded-2xl text-center space-y-3 mt-4">
            <h3 className="font-serif text-sm font-bold text-[#1C1B18]">
              Questions regarding our privacy measures?
            </h3>
            <p className="text-xs text-[#787363] leading-relaxed max-w-lg mx-auto">
              Please reach out directly to our Data Privacy Officer at{" "}
              <a href="mailto:privacy@hippohealth.ai" className="font-bold text-[#8C6B1F] hover:underline">
                privacy@hippohealth.ai
              </a>.
            </p>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}

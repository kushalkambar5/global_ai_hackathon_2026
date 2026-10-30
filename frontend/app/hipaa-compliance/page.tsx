"use client";

import React from "react";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function HIPAACompliancePage() {
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
            HIPAA Compliance Statement
          </h1>
          <p className="text-xs text-[#787363] font-sans flex items-center gap-2">
            <MaterialIcon name="schedule" className="text-xs" />
            <span>Effective Date: August 1, 2026</span>
            <span>•</span>
            <MaterialIcon name="verified_user" className="text-xs text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Protected Health Information (PHI) Secure</span>
          </p>
        </header>

        {/* Main Document Body */}
        <article className="bg-white border border-[#E6E1D3] rounded-[32px] p-8 md:p-12 shadow-2xs space-y-10 font-sans">
          
          {/* Summary / Lead Paragraph */}
          <div className="border-b border-[#F0EBE0] pb-6">
            <p className="text-sm text-[#4D493E] leading-relaxed">
              Hippo Health is fully committed to compliance with the Health Insurance Portability and Accountability Act of 1996 (HIPAA) and the Health Information Technology for Economic and Clinical Health Act (HITECH). We have implemented comprehensive administrative, physical, and technical safeguards to secure Protected Health Information (PHI).
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                <MaterialIcon name="admin_panel_settings" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                1. Technical Safeguards
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Our engineering architecture enforces state-of-the-art cybersecurity to protect diagnostic images, clinician reviews, and telemetry streams:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Data Encryption:</strong> All PHI, including radiology scans, medical reports, and smartwatch logs, is encrypted in transit using TLS 1.3 and at rest with AES-256.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Unique Access Controls:</strong> Every clinician and patient is assigned a unique username and authentication credential. Role-based access control (RBAC) ensures medical files are only accessible to verified providers involved in a patient's care.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Audit Logging:</strong> The platform maintains tamper-evident audit logs. Every view, edit, upload, or deletion of a medical scan or clinical history file is recorded with timestamps and user identifiers.
                </span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span>
                  <strong>Automatic Session Timeout:</strong> Inactive clinical dashboard sessions are automatically logged out after 15 minutes of idle time to prevent unauthorized physical screen viewing.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                <MaterialIcon name="domain" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                2. Physical Safeguards
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Hippo Health assets and server environments are housed inside secure facilities:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>Compliant Cloud Infrastructure:</strong> Database and computing services are hosted on SOC 2 Type II and ISO 27001 certified cloud datacenters with strict physical perimeter control and biometric check-ins.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>No Local Storage:</strong> PHI is never stored on employee laptops, workstation hard drives, or mobile phone clients. Everything resides in specialized secure virtual private clouds (VPCs).</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <MaterialIcon name="groups" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                3. Administrative Safeguards
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              Operational processes are designed to prevent accidental information leaks:
            </p>
            <ul className="space-y-3.5 pl-11">
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>Staff Access Rules:</strong> Access to databases containing PHI is restricted using the Principle of Least Privilege. Only engineering staff resolving critical outages have monitored, temporary access.</span>
              </li>
              <li className="text-xs text-[#4D493E] leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B1F] mt-1.5 shrink-0" />
                <span><strong>Incident Response Plan:</strong> We have a detailed data breach notification process. In the highly unlikely event of a PHI breach, affected users and federal agencies will be notified within 60 days in compliance with the HIPAA Breach Notification Rule.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                <MaterialIcon name="handshake" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                4. Business Associate Agreements (BAAs)
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              We sign Business Associate Agreements (BAAs) with all platform sub-processors, server hosting providers, and physician organizations that integrate with Hippo Health. This ensures that every node in our data supply chain adheres to the same high standard of security and federal audit regulations.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
                <MaterialIcon name="badge" className="text-base" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                5. HIPAA Contact Officer
              </h2>
            </div>
            <p className="text-xs text-[#4D493E] leading-relaxed pl-11">
              We have appointed a dedicated Privacy and Security Compliance Officer to monitor platform access audits and conduct routine threat assessments.
            </p>
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] p-5 rounded-2xl pl-11 space-y-2">
              <p className="text-xs text-[#4D493E]">
                <strong>Compliance Officer:</strong> HIPAA Compliance & Security Desk
              </p>
              <p className="text-xs text-[#4D493E]">
                <strong>Email:</strong>{" "}
                <a href="mailto:hipaa@hippohealth.ai" className="font-bold text-[#8C6B1F] hover:underline">
                  hipaa@hippohealth.ai
                </a>
              </p>
              <p className="text-xs text-[#4D493E]">
                <strong>Address:</strong> Hippo Health Inc., 500 Clinical AI Way, Suite 100, San Francisco, CA 94107
              </p>
            </div>
          </section>

          {/* Verification Badge */}
          <div className="bg-[#E6F5EE] border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center space-y-2 mt-4">
            <span className="material-symbols-outlined text-3xl text-emerald-700">check_circle</span>
            <h3 className="font-serif text-sm font-bold text-emerald-950">
              Verified Compliance Status
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-lg mx-auto">
              Our clinical database systems undergo third-party auditing to ensure continuous alignment with the HIPAA Security and Privacy rules.
            </p>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}

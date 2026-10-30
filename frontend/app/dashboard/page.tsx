"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import Link from "next/link";

type TabType = "body" | "disease" | "chat" | "metrics";

// ─── Doctor EHR Workspace ────────────────────────────────────────────────────
// Completely separate component so the main dashboard never fetches personal
// data (profile, scans, metrics) when a DOCTOR is logged in.
function DoctorDashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18] font-sans antialiased">
      <HeaderNav />
      <main className="flex-1 w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PatientsDashboardWrapper />
      </main>
      <Footer />
    </div>
  );
}

// ─── Main Dashboard (Patients only) ─────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Patient-only state — never declared for doctor sessions
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Redirect if not authenticated or onboarding incomplete
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session && !session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [status, session, router]);

  // Only fetch personal data for PATIENT role
  useEffect(() => {
    if (status === "authenticated" && session && session.user.role === "PATIENT") {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const profileResp = await fetch("/api/user/profile");
          if (profileResp.ok) setProfile(await profileResp.json());

          const historyResp = await fetch("/api/medical-history");
          if (historyResp.ok) {
            const d = await historyResp.json();
            setScans(d.scans || []);
            setReports(d.reports || []);
          }

          const metricsResp = await fetch("/api/health/metrics");
          if (metricsResp.ok) setMetrics((await metricsResp.json()) || []);

          const doctorsResp = await fetch("/api/patient/doctors");
          if (doctorsResp.ok) setDoctors((await doctorsResp.json()) || []);
        } catch (error) {
          console.error("Error loading dashboard data:", error);
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    } else if (status === "authenticated" && session && session.user.role !== "PATIENT") {
      // Non-patient roles need no personal data fetch — mark loading as done
      setLoadingData(false);
    }
  }, [status, session]);

  // ── Loading / unauthenticated guards ────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
        <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-[#787363]">Verifying clinical session...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) return null;

  const role = session.user.role || "PATIENT";
  const name = session.user.name || "User";

  // ── Doctor: render the dedicated EHR workspace, zero personal data used ─────
  if (role === "DOCTOR") {
    return <DoctorDashboard />;
  }

  // ── Patient-only helpers & derived data ─────────────────────────────────────
  // Tab definitions with dedicated page routes
  const tabs = [
    { id: "body", label: "Visualize My Body", icon: "accessibility_new", href: "/visualize-body", bg: "hover:border-[#8C6B1F]/30" },
    { id: "disease", label: "Detect Disease", icon: "biotech", href: "/detect-disease", bg: "hover:border-amber-500/30" },
    { id: "chat", label: "Chat with Hippo", icon: "forum", href: "/chat-with-hippo", bg: "hover:border-emerald-500/30" },
    { id: "metrics", label: "See my Health Metrics", icon: "monitoring", href: "/health-metrics", bg: "hover:border-violet-500/30" },
  ];

  // Helper to compute patient age
  const computeAge = (dobString: string | null) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // Safe BMI Calculation
  const calculateBMI = (heightCm: string | null, weightKg: string | null) => {
    if (!heightCm || !weightKg) return null;
    const heightM = parseFloat(heightCm) / 100;
    const weight = parseFloat(weightKg);
    if (heightM <= 0 || weight <= 0) return null;
    const bmi = weight / (heightM * heightM);
    let category = "Normal";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi >= 25 && bmi < 30) category = "Overweight";
    else if (bmi >= 30) category = "Obese";
    return { value: bmi.toFixed(1), category };
  };

  const age = profile ? computeAge(profile.dateOfBirth) : null;
  const bmiInfo = profile ? calculateBMI(profile.heightCm, profile.weightKg) : null;

  // Process latest metrics
  const latestMetric = metrics[0];
  const hasSyncedMetrics = metrics.length > 0;

  const hasBpm = latestMetric && latestMetric.heartRateAvg !== undefined && latestMetric.heartRateAvg !== null;
  const bpm = hasBpm ? latestMetric.heartRateAvg : "-";

  const hasSpo2 = latestMetric && latestMetric.spo2Percentage !== undefined && latestMetric.spo2Percentage !== null;
  const spo2 = hasSpo2 ? parseFloat(latestMetric.spo2Percentage) : "-";

  const hasSteps = latestMetric && latestMetric.steps !== undefined && latestMetric.steps !== null;
  const stepsCount = hasSteps ? latestMetric.steps : "-";

  const hasSleep = latestMetric && latestMetric.sleepDurationMinutes !== undefined && latestMetric.sleepDurationMinutes !== null;
  const sleepHrs = hasSleep ? (latestMetric.sleepDurationMinutes / 60).toFixed(1) : "-";

  // Find active doctor
  const activeDoctor = doctors.find((doc) => doc.isAssociated && doc.isActive);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18] font-sans antialiased">
      <HeaderNav />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Section / Vitals Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1C1B18] via-[#2A2925] to-[#1C1B18] text-[#FAF9F5] border border-[#3E3A32] p-8 rounded-[36px] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[#FAF6E8] opacity-80 uppercase">
                Hippo AI Clinical Core: Online
              </span>
            </div>
            
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                Welcome back, {role === "DOCTOR" ? `Dr. ${name}` : name}
              </h2>
              <p className="text-xs text-[#FAF6E8]/70 mt-1.5 font-medium">
                Clinical Hub — Logged in as <strong className="text-[#F4E071] uppercase">{role}</strong>
              </p>
            </div>

            {/* Quick Vitals Strip for Patient */}
            {role === "PATIENT" && profile && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {age !== null && (
                  <span className="text-[10px] font-bold uppercase bg-white/10 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                    <MaterialIcon name="cake" className="text-xs text-[#F4E071]" />
                    {age} Years Old
                  </span>
                )}
                {profile.bloodGroup && (
                  <span className="text-[10px] font-bold uppercase bg-white/10 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                    <MaterialIcon name="bloodtype" className="text-xs text-[#F4E071]" />
                    Blood {profile.bloodGroup}
                  </span>
                )}
                {profile.heightCm && (
                  <span className="text-[10px] font-bold uppercase bg-white/10 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                    <MaterialIcon name="height" className="text-xs text-[#F4E071]" />
                    {profile.heightCm} cm
                  </span>
                )}
                {profile.weightKg && (
                  <span className="text-[10px] font-bold uppercase bg-white/10 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                    <MaterialIcon name="weight" className="text-xs text-[#F4E071]" />
                    {profile.weightKg} kg
                  </span>
                )}
                {bmiInfo && (
                  <span className="text-[10px] font-bold uppercase bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs text-emerald-300">
                    <MaterialIcon name="speed" className="text-xs" />
                    BMI: {bmiInfo.value} ({bmiInfo.category})
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Standard User View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column (2/3 width on large screens) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Quick Actions grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#787363]">
                  Clinical Diagnostics & Chat
                </h3>
                <div className={`grid gap-4 ${role === "PATIENT" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
                  {tabs.map((tab) => (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={`group p-5 rounded-3xl border border-[#E6E1D3] bg-[#FAF9F5] hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col items-center gap-3 cursor-pointer ${tab.bg}`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF6E8] border border-[#E6E1D3] group-hover:bg-[#F0E8C8] flex items-center justify-center transition-colors">
                        <MaterialIcon name={tab.icon} className="text-xl text-[#8C6B1F]" />
                      </div>
                      <span className="text-[11px] font-bold font-sans tracking-wide text-center leading-snug">{tab.label}</span>
                    </Link>
                  ))}
                  {/* Patient-only: Tasks & Diet card */}
                  {role === "PATIENT" && (
                    <Link
                      href="/tasks-diet"
                      className="group p-5 rounded-3xl border border-emerald-200/60 bg-emerald-50/40 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300 flex flex-col items-center gap-3 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/60 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <MaterialIcon name="task_alt" className="text-xl text-emerald-600" />
                      </div>
                      <span className="text-[11px] font-bold font-sans tracking-wide text-center leading-snug text-emerald-700">Tasks & Diet</span>
                    </Link>
                  )}
                  {/* Patient-only: Chat with Doctor card */}
                  {role === "PATIENT" && (
                    <Link
                      href="/chat"
                      className="group p-5 rounded-3xl border border-[#1C5396]/20 bg-[#EAF3FB] hover:bg-white hover:border-[#1C5396]/40 hover:shadow-md transition-all duration-300 flex flex-col items-center gap-3 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#C8DEF5]/50 border border-[#1C5396]/20 group-hover:bg-[#C8DEF5]/80 flex items-center justify-center transition-colors">
                        <MaterialIcon name="chat" className="text-xl text-[#1C5396]" />
                      </div>
                      <span className="text-[11px] font-bold font-sans tracking-wide text-center leading-snug text-[#1C5396]">Chat with Doctor</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#787363]">
                    Health Indicators & Smartwatch Telemetry
                  </h3>
                  <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                    hasSyncedMetrics 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                      : "bg-[#FAF6E8] text-[#8C6B1F] border-[#E6E1D3]"
                  }`}>
                    {hasSyncedMetrics ? "Live Smartwatch Sync" : "Clinical Baselines"}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Heart Rate */}
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-5 space-y-4 hover:shadow-xs transition-shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-wide text-[#787363] uppercase">Heart Rate</span>
                      <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
                        <MaterialIcon name="favorite" className="text-md text-rose-500" />
                      </div>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold tracking-tight">
                        {hasBpm ? (
                          <>
                            {bpm} <span className="text-xs font-sans font-normal text-[#787363]">bpm</span>
                          </>
                        ) : (
                          "-"
                        )}
                      </p>
                      <p className={`text-[9px] font-bold mt-1 uppercase ${hasBpm ? "text-rose-600" : "text-[#787363]"}`}>
                        {hasBpm ? "Optimal Range" : "-"}
                      </p>
                    </div>
                  </div>

                  {/* SpO2 */}
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-5 space-y-4 hover:shadow-xs transition-shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-wide text-[#787363] uppercase">Blood Oxygen</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <MaterialIcon name="water_drop" className="text-md text-blue-500" />
                      </div>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold tracking-tight">
                        {hasSpo2 ? (
                          <>
                            {spo2}% <span className="text-xs font-sans font-normal text-[#787363]">SpO2</span>
                          </>
                        ) : (
                          "-"
                        )}
                      </p>
                      <p className={`text-[9px] font-bold mt-1 uppercase ${hasSpo2 ? "text-blue-600" : "text-[#787363]"}`}>
                        {hasSpo2 ? "Fully Saturated" : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Sleep */}
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-5 space-y-4 hover:shadow-xs transition-shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-wide text-[#787363] uppercase">Sleep Quality</span>
                      <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
                        <MaterialIcon name="bedtime" className="text-md text-violet-500" />
                      </div>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold tracking-tight">
                        {hasSleep ? (
                          <>
                            {sleepHrs} <span className="text-xs font-sans font-normal text-[#787363]">hrs</span>
                          </>
                        ) : (
                          "-"
                        )}
                      </p>
                      <p className={`text-[9px] font-bold mt-1 uppercase ${hasSleep ? "text-violet-600" : "text-[#787363]"}`}>
                        {hasSleep ? "Restful Sleep" : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-5 space-y-4 hover:shadow-xs transition-shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-wide text-[#787363] uppercase">Activity</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <MaterialIcon name="directions_walk" className="text-md text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold tracking-tight">
                        {hasSteps ? (
                          <>
                            {stepsCount.toLocaleString()} <span className="text-xs font-sans font-normal text-[#787363]">steps</span>
                          </>
                        ) : (
                          "-"
                        )}
                      </p>
                      <p className={`text-[9px] font-bold mt-1 uppercase ${hasSteps ? "text-emerald-600" : "text-[#787363]"}`}>
                        {hasSteps ? "Active State" : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnostic Scans History Feed */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#787363]">
                    Recent Diagnostic Scans
                  </h3>
                  <Link href="/medical-history" className="text-[10px] font-bold uppercase text-[#8C6B1F] hover:underline flex items-center gap-1">
                    Full Records <MaterialIcon name="chevron_right" className="text-[14px]" />
                  </Link>
                </div>

                {loadingData ? (
                  <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-8 text-center animate-pulse">
                    <p className="text-xs text-[#787363] font-semibold">Retrieving scan logs...</p>
                  </div>
                ) : scans.length === 0 ? (
                  <div className="bg-white border border-[#E6E1D3] rounded-[32px] p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#FAF6E8] text-[#8C6B1F] flex items-center justify-center mx-auto">
                      <MaterialIcon name="biotech" className="text-xl" />
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-bold text-[#1C1B18]">No scans uploaded yet</h4>
                      <p className="text-[11px] text-[#787363] max-w-xs mx-auto mt-1 leading-relaxed">
                        Execute diagnostic scans for Chest, Skin, Brain MRI, Bone Fracture, or ECG on the Detect Disease page.
                      </p>
                    </div>
                    <Link
                      href="/detect-disease"
                      className="inline-block px-4 py-2 bg-[#1C1B18] text-white hover:bg-[#32302A] transition-colors rounded-xl text-[10px] font-bold uppercase"
                    >
                      Run First Scan
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scans.slice(0, 4).map((scan) => (
                      <div key={scan.id} className="bg-white border border-[#E6E1D3] rounded-3xl p-5 hover:shadow-xs transition-all flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase bg-[#FAF6E8] border border-[#E6E1D3] px-2 py-0.5 rounded text-[#8C6B1F]">
                              {scan.scanType.replace("_", " ")}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              scan.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : scan.status === "PENDING" || scan.status === "PROCESSING"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-rose-50 text-rose-600 border-rose-200"
                            }`}>
                              {scan.status}
                            </span>
                          </div>

                          <h4 className="font-serif text-sm font-bold text-[#1C1B18] mt-1.5 leading-snug">
                            {scan.predictionResult?.diagnosis || scan.predictionResult?.risk_prediction !== undefined 
                              ? `Diagnosis: ${scan.predictionResult?.diagnosis || (scan.predictionResult?.risk_prediction === 1 ? "Elevated Risk" : "Normal Risk")}`
                              : "Analysis Pending"}
                          </h4>

                          <p className="text-[10px] text-[#787363] line-clamp-2 leading-relaxed">
                            {scan.aiExplanation || "The AI is compiling diagnostic data and will produce biological maps and suggested medicine guidelines shortly."}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-[#FAF6E8] text-[9px] font-bold text-[#787363]">
                          <span>
                            {new Date(scan.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <Link href="/medical-history" className="text-[#8C6B1F] hover:underline flex items-center gap-0.5">
                            Details <MaterialIcon name="arrow_forward" className="text-[10px]" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (1/3 width on large screens) */}
            <div className="space-y-8">
              

              {/* Care Team Section (Patient Only) */}
              {role === "PATIENT" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#787363]">
                    My Care Team
                  </h3>

                  {loadingData ? (
                    <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-6 text-center animate-pulse">
                      <p className="text-xs text-[#787363] font-semibold">Contacting care team...</p>
                    </div>
                  ) : activeDoctor ? (
                    <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-6 space-y-4 hover:shadow-xs transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border bg-white shrink-0">
                          <img
                            src={activeDoctor.profileImageUrl || "/avatars/avatar1.svg"}
                            alt="Doctor profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-serif text-sm font-bold text-[#1C1B18]">Dr. {activeDoctor.fullName}</h4>
                          <p className="text-[10px] text-[#787363] font-sans font-semibold">
                            {activeDoctor.specialization || "General Physician"}
                          </p>
                          <p className="text-[9px] text-[#A8A28E] font-medium leading-none mt-0.5">
                            {activeDoctor.hospitalAffiliation || "Associated Clinic"}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-[#787363] leading-relaxed italic bg-white/40 p-2.5 rounded-xl border border-[#FAF6E8]">
                        "{activeDoctor.bio || "HippoHealth certified medical specialist here to consult on your scans, reports, and biometrics."}"
                      </div>

                      <Link
                        href="/chat"
                        className="w-full py-2.5 bg-[#1C5396] hover:bg-[#154175] text-white transition-colors rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <MaterialIcon name="chat" className="text-sm" />
                        <span>Send Secure Message</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E6E1D3] rounded-[32px] p-6 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 text-[#B34515] flex items-center justify-center mx-auto border border-orange-100">
                        <MaterialIcon name="clinical_trial" className="text-lg" />
                      </div>
                      <div>
                        <h4 className="font-serif text-xs font-bold text-[#1C1B18]">No Physician Connected</h4>
                        <p className="text-[10px] text-[#787363] leading-relaxed mt-1">
                          Link your record to a clinician to get verification on scans, medication recommendations, and logs.
                        </p>
                      </div>
                      <Link
                        href="/manage-doctors"
                        className="inline-block w-full py-2 bg-[#1C1B18] text-white hover:bg-[#32302A] transition-colors rounded-xl text-[10px] font-bold uppercase"
                      >
                        Connect Doctor
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Patient Record Snapshot */}
              {role === "PATIENT" && profile && (
                <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-[#E6E1D3] pb-3">
                    <MaterialIcon name="assignment_ind" className="text-[#8C6B1F] text-lg" />
                    <h4 className="font-serif text-sm font-bold text-[#1C1B18]">Clinical Record Snapshot</h4>
                  </div>

                  <div className="space-y-3 text-xs font-sans">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[#A8A28E] mb-0.5">Allergies</span>
                      <p className="text-[11px] font-bold text-[#1C1B18]">
                        {profile.allergiesJson || "No allergies documented"}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[#A8A28E] mb-0.5">Chronic Conditions</span>
                      <p className="text-[11px] font-bold text-[#1C1B18]">
                        {profile.chronicConditionsJson || "No conditions documented"}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[#A8A28E] mb-0.5">Current Medications</span>
                      <p className="text-[11px] font-bold text-[#1C1B18]">
                        {profile.currentMedicationsJson || "No medications documented"}
                      </p>
                    </div>
                    {profile.emergencyContactPhone && (
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-[#A8A28E] mb-0.5">Emergency Contact</span>
                        <p className="text-[11px] font-bold text-[#1C1B18] flex items-center gap-1">
                          <MaterialIcon name="call" className="text-[10px] text-[#8C6B1F]" />
                          {profile.emergencyContactPhone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
      </main>

      <Footer />
    </div>
  );
}

// Lazy loaded PatientsDashboard wrapper
function PatientsDashboardWrapper() {
  const [Component, setComponent] = useState<any>(null);

  useEffect(() => {
    import("@/components/dashboard/PatientsDashboard").then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <svg className="animate-spin h-8 w-8 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs text-[#787363] font-sans">Assembling physician interface...</span>
      </div>
    );
  }

  return <Component />;
}

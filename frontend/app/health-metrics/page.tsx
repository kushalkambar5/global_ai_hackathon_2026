"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface HealthMetric {
  id: string;
  patientId: string;
  steps: number | null;
  heartRateAvg: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  caloriesBurnt: string | number | null;
  distanceMeters: string | number | null;
  spo2Percentage: string | number | null;
  sleepDurationMinutes: number | null;
  metricDate: string;
  source: string | null;
  syncedAt: string;
}

export default function HealthMetricsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingDemo, setSyncingDemo] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Manual Entry / Update
  const todayStr = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    metricDate: todayStr,
    heartRateAvg: "",
    heartRateMin: "",
    heartRateMax: "",
    spo2Percentage: "",
    steps: "",
    sleepDurationMinutes: "",
    caloriesBurnt: "",
    distanceMeters: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/health/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch health metrics", res.statusText);
      }
    } catch (err) {
      console.error("Error fetching health metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session && !session.user.onboardingComplete) {
      router.push("/onboarding");
    } else if (status === "authenticated") {
      fetchMetrics();
    }
  }, [status, session, router]);

  // Prefill form when opening modal if metric exists for today
  const handleOpenModal = () => {
    const existingToday = metrics.find((m) => m.metricDate === todayStr);
    if (existingToday) {
      setFormData({
        metricDate: existingToday.metricDate,
        heartRateAvg: existingToday.heartRateAvg !== null ? String(existingToday.heartRateAvg) : "",
        heartRateMin: existingToday.heartRateMin !== null ? String(existingToday.heartRateMin) : "",
        heartRateMax: existingToday.heartRateMax !== null ? String(existingToday.heartRateMax) : "",
        spo2Percentage: existingToday.spo2Percentage !== null ? String(existingToday.spo2Percentage) : "",
        steps: existingToday.steps !== null ? String(existingToday.steps) : "",
        sleepDurationMinutes: existingToday.sleepDurationMinutes !== null ? String(existingToday.sleepDurationMinutes) : "",
        caloriesBurnt: existingToday.caloriesBurnt !== null ? String(existingToday.caloriesBurnt) : "",
        distanceMeters: existingToday.distanceMeters !== null ? String(existingToday.distanceMeters) : "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/health/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source: "MANUAL",
        }),
      });

      if (res.ok) {
        showToast("Health metrics saved to database successfully!");
        setIsModalOpen(false);
        await fetchMetrics();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to save metrics.");
      }
    } catch (err) {
      console.error("Error submitting health metric:", err);
      alert("Network error while saving metrics.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Demo Sync for Instant DB Population
  const handleSyncDemoTelemetry = async () => {
    setSyncingDemo(true);
    try {
      const sample = {
        metricDate: todayStr,
        heartRateAvg: 72,
        heartRateMin: 61,
        heartRateMax: 118,
        spo2Percentage: 98.5,
        steps: 8420,
        sleepDurationMinutes: 450, // 7.5 hrs
        caloriesBurnt: 485.5,
        distanceMeters: 6200,
        source: "HEALTH_CONNECT",
      };

      const res = await fetch("/api/health/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sample),
      });

      if (res.ok) {
        showToast("Sample telemetry synced to database!");
        await fetchMetrics();
      } else {
        alert("Failed to sync sample telemetry.");
      }
    } catch (err) {
      console.error("Error syncing telemetry:", err);
    } finally {
      setSyncingDemo(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
        <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-[#787363]">Retrieving health telemetry...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) return null;

  const latestMetric = metrics[0];

  const hasBpm = latestMetric && latestMetric.heartRateAvg !== null && latestMetric.heartRateAvg !== undefined;
  const bpmValue = hasBpm ? String(latestMetric.heartRateAvg) : "—";

  const hasSpo2 = latestMetric && latestMetric.spo2Percentage !== null && latestMetric.spo2Percentage !== undefined;
  const spo2Value = hasSpo2 ? String(latestMetric.spo2Percentage) : "—";

  const hasSteps = latestMetric && latestMetric.steps !== null && latestMetric.steps !== undefined;
  const stepsValue = hasSteps ? latestMetric.steps!.toLocaleString() : "—";

  const hasSleep = latestMetric && latestMetric.sleepDurationMinutes !== null && latestMetric.sleepDurationMinutes !== undefined;
  const sleepValue = hasSleep ? (latestMetric.sleepDurationMinutes! / 60).toFixed(1) : "—";

  const hasCalories = latestMetric && latestMetric.caloriesBurnt !== null && latestMetric.caloriesBurnt !== undefined;
  const caloriesValue = hasCalories ? Number(latestMetric.caloriesBurnt).toLocaleString() : "—";

  const hasDistance = latestMetric && latestMetric.distanceMeters !== null && latestMetric.distanceMeters !== undefined;
  const distanceValue = hasDistance ? (Number(latestMetric.distanceMeters) / 1000).toFixed(2) : "—";

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18] font-sans antialiased">
      <HeaderNav />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1B18] text-[#FAF9F5] px-5 py-3 rounded-2xl shadow-xl border border-[#3E3A32] flex items-center gap-3 animate-fade-in">
          <MaterialIcon name="check_circle" className="text-emerald-400 text-xl" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF9F5] border border-[#E6E1D3] p-6 rounded-[32px] shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6E8] border border-[#E6E1D3] flex items-center justify-center text-[#8C6B1F] shrink-0">
              <MaterialIcon name="monitoring" className="text-2xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1C1B18] leading-tight">Health Metrics</h1>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Database Synced
                </span>
              </div>
              <p className="text-xs text-[#787363] font-sans mt-0.5">Biometrics, daily activity telemetry &amp; clinical logs</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncDemoTelemetry}
              disabled={syncingDemo}
              className="px-4 py-2.5 bg-white border border-[#DCD5C5] hover:bg-[#FAF6E8] text-[#1C1B18] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <MaterialIcon name="sync" className={`text-sm ${syncingDemo ? "animate-spin text-[#8C6B1F]" : "text-[#787363]"}`} />
              <span>{syncingDemo ? "Syncing..." : "Sync Sample Telemetry"}</span>
            </button>

            <button
              onClick={handleOpenModal}
              className="px-5 py-2.5 bg-[#1C1B18] hover:bg-[#2E2C26] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <MaterialIcon name="add_chart" className="text-sm" />
              <span>Log Vitals Manually</span>
            </button>
          </div>
        </div>

        {/* Latest Metric Summary Cards */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#787363]">
              Latest Recorded Biometrics {latestMetric && `(${latestMetric.metricDate})`}
            </h2>
            {latestMetric && (
              <span className="text-[10px] text-[#A8A28E] font-medium">
                Source: <strong className="text-[#8C6B1F] uppercase">{latestMetric.source || "HEALTH_CONNECT"}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Heart Rate */}
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[28px] p-6 shadow-xs flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#787363] font-bold uppercase tracking-wider">Heart Rate</p>
                <p className="font-serif text-3xl font-bold text-[#1C1B18] leading-tight">
                  {bpmValue} <span className="text-sm font-sans font-normal text-[#A8A28E]">bpm</span>
                </p>
                {latestMetric?.heartRateMin && latestMetric?.heartRateMax ? (
                  <p className="text-[10px] text-[#787363] font-medium">
                    Range: <strong className="text-[#1C1B18]">{latestMetric.heartRateMin} - {latestMetric.heartRateMax} bpm</strong>
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Optimal Resting Beat</p>
                )}
              </div>
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 bg-rose-50 border-rose-100 text-rose-500">
                <MaterialIcon name="favorite" className="text-2xl" />
              </div>
            </div>

            {/* Blood Oxygen */}
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[28px] p-6 shadow-xs flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#787363] font-bold uppercase tracking-wider">Blood Oxygen</p>
                <p className="font-serif text-3xl font-bold text-[#1C1B18] leading-tight">
                  {spo2Value} <span className="text-sm font-sans font-normal text-[#A8A28E]">{hasSpo2 ? "% SpO2" : ""}</span>
                </p>
                <p className="text-[10px] text-blue-600 font-bold uppercase">
                  {hasSpo2 ? "Normal Saturation" : "No reading"}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100 text-blue-500">
                <MaterialIcon name="water_drop" className="text-2xl" />
              </div>
            </div>

            {/* Steps Today */}
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[28px] p-6 shadow-xs flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#787363] font-bold uppercase tracking-wider">Daily Steps</p>
                <p className="font-serif text-3xl font-bold text-[#1C1B18] leading-tight">
                  {stepsValue} <span className="text-sm font-sans font-normal text-[#A8A28E]">{hasSteps ? "steps" : ""}</span>
                </p>
                <p className="text-[10px] text-green-700 font-bold uppercase">
                  {hasDistance ? `${distanceValue} km walked` : "Active movement"}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 bg-green-50 border-green-100 text-green-600">
                <MaterialIcon name="directions_walk" className="text-2xl" />
              </div>
            </div>

            {/* Sleep Duration */}
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[28px] p-6 shadow-xs flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#787363] font-bold uppercase tracking-wider">Sleep Duration</p>
                <p className="font-serif text-3xl font-bold text-[#1C1B18] leading-tight">
                  {sleepValue} <span className="text-sm font-sans font-normal text-[#A8A28E]">{hasSleep ? "hrs" : ""}</span>
                </p>
                <p className="text-[10px] text-violet-600 font-bold uppercase">
                  {hasSleep ? `${latestMetric?.sleepDurationMinutes} mins logged` : "Rest schedule"}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 bg-violet-50 border-violet-100 text-violet-500">
                <MaterialIcon name="bedtime" className="text-2xl" />
              </div>
            </div>

            {/* Calories Burned */}
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[28px] p-6 shadow-xs flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#787363] font-bold uppercase tracking-wider">Calories Burned</p>
                <p className="font-serif text-3xl font-bold text-[#1C1B18] leading-tight">
                  {caloriesValue} <span className="text-sm font-sans font-normal text-[#A8A28E]">{hasCalories ? "kcal" : ""}</span>
                </p>
                <p className="text-[10px] text-amber-600 font-bold uppercase">Active &amp; Basal Burn</p>
              </div>
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 bg-amber-50 border-amber-100 text-amber-500">
                <MaterialIcon name="local_fire_department" className="text-2xl" />
              </div>
            </div>

            {/* Distance Travelled */}
            <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[28px] p-6 shadow-xs flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#787363] font-bold uppercase tracking-wider">Distance Covered</p>
                <p className="font-serif text-3xl font-bold text-[#1C1B18] leading-tight">
                  {distanceValue} <span className="text-sm font-sans font-normal text-[#A8A28E]">{hasDistance ? "km" : ""}</span>
                </p>
                <p className="text-[10px] text-cyan-600 font-bold uppercase">GPS &amp; Pedometer</p>
              </div>
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 bg-cyan-50 border-cyan-100 text-cyan-600">
                <MaterialIcon name="map" className="text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Database Telemetry Logs Table */}
        <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1D3] pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1C1B18]">Database Telemetry History</h2>
              <p className="text-xs text-[#787363] font-sans mt-0.5">
                All daily biometrics and smartwatch logs saved in the database
              </p>
            </div>
            <span className="text-xs font-bold text-[#8C6B1F] bg-[#FAF6E8] px-3 py-1 rounded-full border border-[#E6E1D3] w-fit">
              {metrics.length} {metrics.length === 1 ? "Record" : "Records"} Total
            </span>
          </div>

          {loadingMetrics ? (
            <div className="py-12 text-center text-[#787363] space-y-3">
              <svg className="animate-spin h-8 w-8 text-[#8C6B1F] mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs font-semibold">Querying health metrics from database...</p>
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4 bg-white rounded-2xl border border-[#E6E1D3]">
              <div className="w-14 h-14 rounded-full bg-[#FAF6E8] text-[#8C6B1F] flex items-center justify-center mx-auto border border-[#E6E1D3]">
                <MaterialIcon name="database" className="text-2xl" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1C1B18]">No health records found in database</h3>
                <p className="text-xs text-[#787363] max-w-md mx-auto mt-1 leading-relaxed">
                  Log your daily vitals using the manual form or click "Sync Sample Telemetry" to populate your record.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={handleSyncDemoTelemetry}
                  disabled={syncingDemo}
                  className="px-5 py-2.5 bg-[#8C6B1F] hover:bg-[#735718] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Sync Sample Telemetry
                </button>
                <button
                  onClick={handleOpenModal}
                  className="px-5 py-2.5 bg-[#1C1B18] hover:bg-[#2E2C26] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Log Vitals Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#E6E1D3] text-[10px] font-bold uppercase tracking-wider text-[#787363] bg-[#FAF6E8]/60">
                    <th className="py-3 px-4 rounded-l-xl">Date</th>
                    <th className="py-3 px-4">Heart Rate</th>
                    <th className="py-3 px-4">Blood Oxygen</th>
                    <th className="py-3 px-4">Steps</th>
                    <th className="py-3 px-4">Sleep</th>
                    <th className="py-3 px-4">Calories</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 rounded-r-xl">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D3]/60 text-xs font-sans">
                  {metrics.map((m) => (
                    <tr key={m.id || m.metricDate} className="hover:bg-white/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#1C1B18]">
                        {m.metricDate}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {m.heartRateAvg !== null ? (
                          <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                            <MaterialIcon name="favorite" className="text-xs" />
                            {m.heartRateAvg} bpm
                            {m.heartRateMin && m.heartRateMax && (
                              <span className="text-[10px] text-[#A8A28E] font-normal">
                                ({m.heartRateMin}-{m.heartRateMax})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[#A8A28E]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {m.spo2Percentage !== null ? (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <MaterialIcon name="water_drop" className="text-xs" />
                            {m.spo2Percentage}%
                          </span>
                        ) : (
                          <span className="text-[#A8A28E]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {m.steps !== null ? (
                          <span className="font-semibold text-[#1C1B18]">
                            {m.steps.toLocaleString()} steps
                          </span>
                        ) : (
                          <span className="text-[#A8A28E]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {m.sleepDurationMinutes !== null ? (
                          <span className="text-violet-700 font-semibold">
                            {(m.sleepDurationMinutes / 60).toFixed(1)} hrs
                          </span>
                        ) : (
                          <span className="text-[#A8A28E]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {m.caloriesBurnt !== null ? (
                          <span className="text-amber-700 font-semibold">
                            {Number(m.caloriesBurnt).toLocaleString()} kcal
                          </span>
                        ) : (
                          <span className="text-[#A8A28E]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          m.source === "HEALTH_CONNECT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-[#FAF6E8] text-[#8C6B1F] border-[#E6E1D3]"
                        }`}>
                          {m.source || "MANUAL"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[#787363]">
                        {m.syncedAt ? new Date(m.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Smartwatch Integration Banner */}
        <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] p-8 text-center shadow-xs flex flex-col justify-center items-center">
          <div className="w-14 h-14 rounded-full bg-[#FAF6E8] text-[#8C6B1F] flex items-center justify-center mb-4 border border-[#E6E1D3]">
            <MaterialIcon name="watch" className="text-2xl" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1C1B18] mb-1">Wearable Telemetry Sync</h2>
          <p className="text-xs text-[#787363] font-sans max-w-md leading-relaxed">
            HippoHealth automatically accepts Android Health Connect, Apple HealthKit, and Garmin smartwatch streams.
          </p>
          <span className="text-[9px] font-bold tracking-widest uppercase text-[#8C6B1F] font-sans mt-3 border border-[#E6E1D3] px-3 py-1 rounded-full bg-[#FAF6E8]">
            Direct Sync Active
          </span>
        </div>
      </main>

      {/* Log Vitals Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E6E1D3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#E6E1D3] flex items-center justify-center text-[#8C6B1F]">
                  <MaterialIcon name="edit_calendar" className="text-xl" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1C1B18]">Log Health Vitals</h3>
                  <p className="text-xs text-[#787363]">Save your biometrics to the database</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#E6E1D3]/50 hover:bg-[#E6E1D3] flex items-center justify-center text-[#1C1B18] transition-colors cursor-pointer"
              >
                <MaterialIcon name="close" className="text-sm" />
              </button>
            </div>

            <form onSubmit={handleSubmitMetric} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                  Metric Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.metricDate}
                  onChange={(e) => setFormData({ ...formData, metricDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18] font-medium focus:outline-none focus:border-[#8C6B1F]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Heart Rate Avg
                  </label>
                  <input
                    type="number"
                    placeholder="72 bpm"
                    value={formData.heartRateAvg}
                    onChange={(e) => setFormData({ ...formData, heartRateAvg: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Heart Rate Min
                  </label>
                  <input
                    type="number"
                    placeholder="60 bpm"
                    value={formData.heartRateMin}
                    onChange={(e) => setFormData({ ...formData, heartRateMin: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Heart Rate Max
                  </label>
                  <input
                    type="number"
                    placeholder="120 bpm"
                    value={formData.heartRateMax}
                    onChange={(e) => setFormData({ ...formData, heartRateMax: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Blood Oxygen (% SpO2)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.5"
                    value={formData.spo2Percentage}
                    onChange={(e) => setFormData({ ...formData, spo2Percentage: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Steps Count
                  </label>
                  <input
                    type="number"
                    placeholder="8500"
                    value={formData.steps}
                    onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Sleep (Minutes)
                  </label>
                  <input
                    type="number"
                    placeholder="450 (7.5 hrs)"
                    value={formData.sleepDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, sleepDurationMinutes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="450"
                    value={formData.caloriesBurnt}
                    onChange={(e) => setFormData({ ...formData, caloriesBurnt: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#787363] mb-1">
                    Distance (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6000"
                    value={formData.distanceMeters}
                    onChange={(e) => setFormData({ ...formData, distanceMeters: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E1D3] rounded-xl text-[#1C1B18]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E6E1D3]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#E6E1D3]/40 hover:bg-[#E6E1D3] text-[#1C1B18] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1C1B18] hover:bg-[#2E2C26] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Saving..." : "Save to DB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import Image from "next/image";

interface Conversation {
  conversationId: string;
  patientId: string;
  doctorId: string;
  conversationTranscription: string | null;
  conversationSummary: string | null;
  conversationMedication: string[] | null;
  conversationAudio: string | null;
  createdAt: string;
  updatedAt: string;
  doctorName: string | null;
  doctorEmail: string | null;
  doctorImage: string | null;
  doctorSpecialization: string | null;
  hospitalAffiliation: string | null;
}

export default function PatientConversationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authentication and role redirection
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session) {
      if (!session.user.onboardingComplete) {
        router.push("/onboarding");
      } else if (session.user.role !== "PATIENT") {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations/my");
      if (!res.ok) {
        throw new Error("Failed to retrieve your conversation history.");
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while loading consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "PATIENT") {
      fetchConversations();
    }
  }, [status, session]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Doctors list for filter dropdown
  const uniqueDoctors = Array.from(
    new Map(
      conversations
        .filter((c) => c.doctorName)
        .map((c) => [c.doctorId, { id: c.doctorId, name: c.doctorName }])
    ).values()
  );

  // Filtering
  const filteredConversations = conversations.filter((conv) => {
    const matchesDoctor =
      selectedDoctorFilter === "ALL" || conv.doctorId === selectedDoctorFilter;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesDoctor;

    const matchesName = conv.doctorName?.toLowerCase().includes(query) || false;
    const matchesSpec = conv.doctorSpecialization?.toLowerCase().includes(query) || false;
    const matchesHospital = conv.hospitalAffiliation?.toLowerCase().includes(query) || false;
    const matchesSummary = conv.conversationSummary?.toLowerCase().includes(query) || false;
    const matchesTranscript = conv.conversationTranscription?.toLowerCase().includes(query) || false;
    const matchesMedication =
      conv.conversationMedication?.some((med) => med.toLowerCase().includes(query)) || false;

    return (
      matchesDoctor &&
      (matchesName ||
        matchesSpec ||
        matchesHospital ||
        matchesSummary ||
        matchesTranscript ||
        matchesMedication)
    );
  });

  // Calculate statistics
  const totalConversations = conversations.length;
  const allMedications = Array.from(
    new Set(conversations.flatMap((c) => c.conversationMedication || []))
  );
  const totalDoctors = uniqueDoctors.length;
  const latestDate =
    conversations.length > 0
      ? new Date(conversations[0].createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "None yet";

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] dark:bg-[#141311] text-[#1C1B18] dark:text-zinc-100 font-sans antialiased transition-colors">
      <HeaderNav />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header Hero */}
        <div className="bg-gradient-to-br from-[#1C1B18] via-[#2A2925] to-[#1C1B18] text-[#FAF9F5] border border-[#3E3A32] rounded-[36px] p-8 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              Doctor-Patient Conversations
            </h1>
            <p className="text-xs md:text-sm text-[#FAF6E8]/75 max-w-2xl font-medium leading-relaxed">
              Review full audio recordings, AI clinical summaries, and transcriptions from your medical consultations with verified clinicians.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 shrink-0">
            <button
              onClick={fetchConversations}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer backdrop-blur-sm"
            >
              <MaterialIcon name="refresh" className={`text-base ${loading ? "animate-spin" : ""}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {/* Subtle background decoration */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#8C6B1F]/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Analytics & Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 p-5 rounded-3xl shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold tracking-wide text-[#787363] dark:text-zinc-400 uppercase">
                Recorded Consultations
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF3FB] dark:bg-blue-950/50 border border-[#C8DEF5] dark:border-blue-800 flex items-center justify-center">
                <MaterialIcon name="mic" className="text-[#1C5396] dark:text-blue-400 text-base" />
              </div>
            </div>
            <p className="font-serif text-2xl font-bold text-[#1C1B18] dark:text-zinc-100 mt-2">
              {totalConversations}
            </p>
            <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-1">
              Cloudflare R2 Stored
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 p-5 rounded-3xl shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold tracking-wide text-[#787363] dark:text-zinc-400 uppercase">
                Doctors Consulted
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FAF6E8] dark:bg-amber-950/50 border border-[#FAF6E8] dark:border-amber-800 flex items-center justify-center">
                <MaterialIcon name="medical_services" className="text-[#8C6B1F] dark:text-amber-400 text-base" />
              </div>
            </div>
            <p className="font-serif text-2xl font-bold text-[#1C1B18] dark:text-zinc-100 mt-2">
              {totalDoctors}
            </p>
            <p className="text-[8px] font-bold text-[#787363] dark:text-zinc-400 uppercase mt-1">
              Verified Clinicians
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 p-5 rounded-3xl shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold tracking-wide text-[#787363] dark:text-zinc-400 uppercase">
                Medications Mentioned
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <MaterialIcon name="medication" className="text-amber-600 dark:text-amber-400 text-base" />
              </div>
            </div>
            <p className="font-serif text-2xl font-bold text-[#1C1B18] dark:text-zinc-100 mt-2">
              {allMedications.length}
            </p>
            <p className="text-[8px] font-bold text-amber-700 dark:text-amber-300 uppercase mt-1">
              Extracted via AI
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 p-5 rounded-3xl shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold tracking-wide text-[#787363] dark:text-zinc-400 uppercase">
                Latest Session
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <MaterialIcon name="calendar_today" className="text-emerald-600 dark:text-emerald-400 text-base" />
              </div>
            </div>
            <p className="font-serif text-base font-bold text-[#1C1B18] dark:text-zinc-100 mt-2 truncate">
              {latestDate}
            </p>
            <p className="text-[8px] font-bold text-[#787363] dark:text-zinc-400 uppercase mt-1">
              EHR Synchronized
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#787363] dark:text-zinc-400">
              <MaterialIcon name="search" className="text-lg" />
            </span>
            <input
              type="text"
              placeholder="Search by doctor, medications, summary, or transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] dark:bg-zinc-800 border border-[#DCD5C5] dark:border-zinc-700 rounded-2xl text-[#1C1B18] dark:text-zinc-100 placeholder-[#A8A28E] dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] text-xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {uniqueDoctors.length > 0 && (
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="px-4 py-2.5 bg-[#FAF9F5] dark:bg-zinc-800 border border-[#DCD5C5] dark:border-zinc-700 rounded-2xl text-xs font-bold text-[#1C1B18] dark:text-zinc-100 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Doctors ({uniqueDoctors.length})</option>
                {uniqueDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            )}

            <span className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl bg-[#FAF6E8] dark:bg-zinc-800 border border-[#FAF6E8] dark:border-zinc-700 text-[#8C6B1F] dark:text-[#D4AF37] whitespace-nowrap">
              {filteredConversations.length} {filteredConversations.length === 1 ? "Session" : "Sessions"}
            </span>
          </div>
        </div>

        {/* Conversations Feed */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-[32px] border border-[#E6E1D3] dark:border-zinc-800">
            <svg className="animate-spin h-8 w-8 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-bold text-[#787363] dark:text-zinc-400 uppercase tracking-wider">
              Loading Consultation Records...
            </span>
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-[32px] p-8 space-y-3">
            <MaterialIcon name="error_outline" className="text-4xl text-red-500" />
            <h3 className="font-serif text-lg font-bold text-red-800 dark:text-red-300">
              Failed to Load Conversations
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchConversations}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 rounded-[32px] p-8 space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#FAF6E8] dark:bg-zinc-800 border border-[#E8E2CF] dark:border-zinc-700 mx-auto flex items-center justify-center">
              <MaterialIcon name="mic_off" className="text-3xl text-[#8C6B1F] dark:text-[#D4AF37]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#1C1B18] dark:text-zinc-100">
                {searchQuery || selectedDoctorFilter !== "ALL"
                  ? "No matching consultations found"
                  : "No Recorded Consultations Yet"}
              </h3>
              <p className="text-xs text-[#787363] dark:text-zinc-400 max-w-md mx-auto">
                {searchQuery || selectedDoctorFilter !== "ALL"
                  ? "Try adjusting your search criteria or doctor filter to find specific records."
                  : "When your doctor records a consultation session during your appointment, the audio, AI clinical summary, and transcription will appear here automatically."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredConversations.map((conv) => {
              const sessionDate = new Date(conv.createdAt).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const sessionTime = new Date(conv.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={conv.conversationId}
                  className="bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                >
                  {/* Card Header: Doctor Profile & Date */}
                  <div className="p-6 border-b border-[#FAF6E8] dark:border-zinc-800/80 bg-[#FAF9F5]/70 dark:bg-zinc-850/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Doctor Avatar */}
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white dark:bg-zinc-800 border border-[#E6E1D3] dark:border-zinc-700 shrink-0">
                        <img
                          src={conv.doctorImage || "/avatars/avatar1.svg"}
                          alt={conv.doctorName || "Doctor"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Doctor Details */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif text-base font-bold text-[#1C1B18] dark:text-zinc-100">
                            Dr. {conv.doctorName || "Attending Clinician"}
                          </h3>
                          {conv.doctorSpecialization && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EAF3FB] dark:bg-blue-950/60 border border-[#C8DEF5] dark:border-blue-800 text-[#1C5396] dark:text-blue-300">
                              {conv.doctorSpecialization}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#787363] dark:text-zinc-400 mt-0.5">
                          {conv.hospitalAffiliation || "HippoHealth Clinical Care Team"}
                        </p>
                      </div>
                    </div>

                    {/* Date & Audio CTA */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <div className="text-right">
                        <span className="block text-xs font-bold text-[#1C1B18] dark:text-zinc-100">
                          {sessionDate}
                        </span>
                        <span className="text-[10px] text-[#787363] dark:text-zinc-400 font-mono">
                          {sessionTime}
                        </span>
                      </div>

                      {conv.conversationAudio && (
                        <a
                          href={conv.conversationAudio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#EAF3FB] dark:bg-blue-950/50 hover:bg-[#C8DEF5] dark:hover:bg-blue-900/50 border border-[#C8DEF5] dark:border-blue-800 text-[#1C5396] dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <MaterialIcon name="volume_up" className="text-sm" />
                          <span>Direct Audio</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Audio Player */}
                  {conv.conversationAudio && (
                    <div className="px-6 py-4 border-b border-[#FAF6E8] dark:border-zinc-800/80 bg-[#FAF9F5]/30 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-[10px] font-bold uppercase text-[#787363] dark:text-zinc-400 shrink-0 flex items-center gap-1.5">
                        <MaterialIcon name="play_circle" className="text-sm text-[#8C6B1F] dark:text-[#D4AF37]" />
                        Playback
                      </span>
                      <audio controls src={conv.conversationAudio} className="w-full h-9 rounded-xl" />
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-6 space-y-6">
                    {/* Summary */}
                    {conv.conversationSummary && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MaterialIcon name="psychology" className="text-base text-[#8C6B1F] dark:text-[#D4AF37]" />
                          <h4 className="text-[10px] font-bold text-[#787363] dark:text-zinc-400 uppercase tracking-wider">
                            AI Clinical Consultation Summary
                          </h4>
                        </div>
                        <div className="bg-[#FAF9F5] dark:bg-zinc-800/60 p-4 rounded-2xl border border-[#E6E1D3]/70 dark:border-zinc-700/60 text-xs text-[#1C1B18] dark:text-zinc-200 leading-relaxed font-sans font-medium">
                          {conv.conversationSummary}
                        </div>
                      </div>
                    )}

                    {/* Medications */}
                    {conv.conversationMedication && conv.conversationMedication.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <MaterialIcon name="pill" className="text-base text-amber-600 dark:text-amber-400" />
                          <h4 className="text-[10px] font-bold text-[#787363] dark:text-zinc-400 uppercase tracking-wider">
                            Medications Discussed ({conv.conversationMedication.length})
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {conv.conversationMedication.map((med, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-bold"
                            >
                              <MaterialIcon name="medication" className="text-xs" />
                              <span>{med}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Exact Transcription */}
                    {conv.conversationTranscription && (
                      <div className="pt-2">
                        <details className="group border border-[#E6E1D3] dark:border-zinc-700 rounded-2xl bg-[#FAF9F5]/40 dark:bg-zinc-800/40 p-4 cursor-pointer">
                          <summary className="flex items-center justify-between text-[10px] font-bold text-[#787363] dark:text-zinc-400 uppercase tracking-wider list-none select-none">
                            <span className="flex items-center gap-2">
                              <MaterialIcon name="subtitles" className="text-sm text-[#8C6B1F] dark:text-[#D4AF37]" />
                              <span>Full Verbatim Audio Transcription (Deepgram)</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-normal text-[#8C6B1F] dark:text-[#D4AF37]">
                                Click to toggle
                              </span>
                              <span className="text-xs text-[#8C6B1F] dark:text-[#D4AF37] group-open:rotate-180 transition-transform">
                                ▼
                              </span>
                            </div>
                          </summary>

                          <div className="mt-4 space-y-3">
                            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-[#E6E1D3] dark:border-zinc-700 text-xs text-[#1C1B18] dark:text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap selection:bg-[#8C6B1F]/20">
                              {conv.conversationTranscription}
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  copyToClipboard(conv.conversationTranscription!, conv.conversationId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCD5C5] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-bold text-[#787363] dark:text-zinc-300 hover:text-[#1C1B18] dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <MaterialIcon
                                  name={copiedId === conv.conversationId ? "check" : "content_copy"}
                                  className="text-xs text-[#8C6B1F] dark:text-[#D4AF37]"
                                />
                                <span>
                                  {copiedId === conv.conversationId ? "Copied to Clipboard!" : "Copy Full Transcript"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

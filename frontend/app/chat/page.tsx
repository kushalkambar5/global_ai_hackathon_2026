"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface Message {
  senderId: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

interface OtherUser {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  specialization?: string;
}

interface PatientListItem {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
}

interface DoctorListItem {
  profileId: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
  specialization: string;
  isAssociated: boolean;
  isActive: boolean;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const patientIdParam = searchParams.get("patientId");
  const doctorIdParam = searchParams.get("doctorId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [patientsList, setPatientsList] = useState<PatientListItem[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorListItem[]>([]);
  const [noDoctorAssigned, setNoDoctorAssigned] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session && !session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "DOCTOR") {
      const fetchPatients = async () => {
        setSidebarLoading(true);
        try {
          const resp = await fetch("/api/doctor/patients");
          if (resp.ok) {
            const data = await resp.json();
            const doctorProfileId = data.doctorProfileId;
            const myPatients = (data.patients || []).filter(
              (p: any) => p.assignedDoctorId === doctorProfileId && p.isActive === true
            );
            setPatientsList(myPatients);
          }
        } catch (err) {
          console.error("Error loading patients list:", err);
        } finally {
          setSidebarLoading(false);
        }
      };
      fetchPatients();
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "PATIENT") {
      const fetchDoctors = async () => {
        setSidebarLoading(true);
        try {
          const resp = await fetch("/api/patient/doctors");
          if (resp.ok) {
            const data = await resp.json();
            const activeDocs = (data || []).filter(
              (doc: any) => doc.isAssociated && doc.isActive
            );
            setDoctorsList(activeDocs);
          }
        } catch (err) {
          console.error("Error loading doctors list:", err);
        } finally {
          setSidebarLoading(false);
        }
      };
      fetchDoctors();
    }
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    const isDoctor = session.user.role === "DOCTOR";
    if (isDoctor && !patientIdParam) {
      setChatLoading(false);
      setMessages([]);
      setOtherUser(null);
      return;
    }

    const fetchChat = async (isInitial = false, retryCount = 0) => {
      if (isInitial && retryCount === 0) {
        setChatLoading(true);
        setError(null);
      }
      
      let shouldSetLoadingFalse = isInitial;

      try {
        const url = isDoctor
          ? `/api/chat/doctor-patient?patientId=${patientIdParam}`
          : doctorIdParam
          ? `/api/chat/doctor-patient?doctorId=${doctorIdParam}`
          : "/api/chat/doctor-patient";

        const resp = await fetch(url);
        if (!resp.ok) {
          // If it's a transient network/proxy error (e.g., 502, 500) and we have retries left
          if (resp.status !== 401 && resp.status !== 403 && retryCount < 2) {
            shouldSetLoadingFalse = false;
            setTimeout(() => fetchChat(isInitial, retryCount + 1), 1000);
            return;
          }

          let errMsg = "Failed to load chat history.";
          try {
            const errData = await resp.json();
            if (errData && errData.message) errMsg = errData.message;
            else if (errData && errData.error) errMsg = errData.error;
          } catch (e) {
            // Ignore parse errors
          }
          throw new Error(errMsg);
        }
        
        const data = await resp.json();

        if (data.success === false && data.code === "NO_DOCTOR_ASSIGNED") {
          setNoDoctorAssigned(true);
          setError(null);
        } else if (data.success) {
          setNoDoctorAssigned(false);
          if (data.otherUser && !isDoctor && !doctorIdParam) {
            router.replace(`/chat?doctorId=${data.otherUser.id}`);
          }
          setMessages((prev) => {
            const next = data.messages || [];
            if (prev.length !== next.length) {
              return next;
            }
            const isDifferent = prev.some((msg, idx) => {
              const nextMsg = next[idx];
              return (
                msg.senderId !== nextMsg.senderId ||
                msg.text !== nextMsg.text ||
                msg.timestamp !== nextMsg.timestamp
              );
            });
            return isDifferent ? next : prev;
          });
          setOtherUser((prev) => {
            const next = data.otherUser || null;
            if (!prev && !next) return null;
            if (!prev || !next) return next;
            if (
              prev.id !== next.id ||
              prev.name !== next.name ||
              prev.avatar !== next.avatar ||
              prev.role !== next.role ||
              prev.specialization !== next.specialization
            ) {
              return next;
            }
            return prev;
          });
          setError(null);
        }
      } catch (err: any) {
        if (isInitial) setError(err.message || "An error occurred.");
      } finally {
        if (shouldSetLoadingFalse) {
          setChatLoading(false);
        }
      }
    };

    fetchChat(true);
    const interval = setInterval(() => fetchChat(false), 3000);
    return () => clearInterval(interval);
  }, [status, session, patientIdParam, doctorIdParam, router]);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [patientIdParam, doctorIdParam]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      if (isFirstLoad.current && messages.length > 0) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        isFirstLoad.current = false;
      } else {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText("");

    try {
      const isDoctor = session?.user.role === "DOCTOR";
      const payload: any = { text: textToSend };
      if (isDoctor && patientIdParam) payload.patientId = patientIdParam;
      if (!isDoctor && doctorIdParam) payload.doctorId = doctorIdParam;

      const resp = await fetch("/api/chat/doctor-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error("Failed to send message.");
      const data = await resp.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err: any) {
      alert(err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
        <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-[#787363]">Opening encrypted chat channel...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) return null;

  const isDoctor = session.user.role === "DOCTOR";
  const myId = session.user.id;

  const filteredPatients = patientsList.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDoctors = doctorsList.filter(
    (d) =>
      d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18] font-sans">
      <HeaderNav />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Page Header */}
        <section className="bg-[#FAF9F5] border border-[#E6E1D3] p-5 rounded-[24px] shadow-2xs shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FAF6E8] border border-[#E6E1D3] flex items-center justify-center">
              <MaterialIcon name="forum" className="text-xl text-[#8C6B1F]" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-[#1C1B18] leading-tight">
                {isDoctor ? "Patient Consultations" : "Chat with My Doctor"}
              </h1>
              <p className="text-[11px] text-[#787363]">
                {isDoctor
                  ? "Direct, encrypted clinical communication with your patients"
                  : "Private messaging channel with your assigned physician"}
              </p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </section>

        {/* Chat System */}
        <div
          className="flex-1 bg-white border border-[#E6E1D3] rounded-[32px] overflow-hidden flex shadow-xs"
          style={{ minHeight: "560px", maxHeight: "680px" }}
        >
          {/* LEFT SIDEBAR — DOCTOR OR PATIENT */}
          <div className="w-72 border-r border-[#E6E1D3] flex flex-col bg-[#FAF9F5] shrink-0">
            <div className="p-4 border-b border-[#E6E1D3] bg-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#787363] mb-2">
                {isDoctor ? `My Patients (${patientsList.length})` : `My Doctors (${doctorsList.length})`}
              </p>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[#787363]">
                  <MaterialIcon name="search" className="text-sm" />
                </span>
                <input
                  type="text"
                  placeholder={isDoctor ? "Search patients..." : "Search doctors..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#FAF6E8] border border-[#E6E1D3] rounded-xl text-[10px] font-semibold placeholder-[#A8A28E] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sidebarLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-[9px] text-[#787363]">Loading roster...</span>
                </div>
              ) : isDoctor ? (
                filteredPatients.length === 0 ? (
                  <div className="py-10 text-center text-[10px] text-[#787363]">
                    {searchQuery ? "No patients match your search." : "No patients currently assigned."}
                  </div>
                ) : (
                  filteredPatients.map((patient) => {
                    const isSelected = patient.id === patientIdParam;
                    return (
                      <button
                        key={patient.id}
                        onClick={() => router.push(`/chat?patientId=${patient.id}`)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border cursor-pointer group ${
                          isSelected
                            ? "bg-[#FAF6E8] border-[#8C6B1F]/30 shadow-inner"
                            : "bg-transparent border-transparent hover:bg-[#FAF6E8]/60 hover:border-[#E6E1D3]"
                        }`}
                      >
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white border border-[#E6E1D3] shrink-0">
                          <img
                            src={patient.profileImageUrl || "/avatars/avatar1.svg"}
                            alt={patient.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block text-[11px] font-bold truncate ${isSelected ? "text-[#8C6B1F]" : "text-[#4D493E] group-hover:text-[#1C1B18]"}`}>
                            {patient.fullName}
                          </span>
                          <span className="block text-[9px] text-[#A8A28E] truncate">{patient.email}</span>
                        </div>
                        {isSelected && (
                          <MaterialIcon name="chevron_right" className="text-sm text-[#8C6B1F] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )
              ) : (
                filteredDoctors.length === 0 ? (
                  <div className="py-10 text-center text-[10px] text-[#787363]">
                    {searchQuery ? "No doctors match your search." : "No doctors currently assigned."}
                  </div>
                ) : (
                  filteredDoctors.map((doc) => {
                    const isSelected = doc.profileId === doctorIdParam;
                    return (
                      <button
                        key={doc.profileId}
                        onClick={() => router.push(`/chat?doctorId=${doc.profileId}`)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border cursor-pointer group ${
                          isSelected
                            ? "bg-[#FAF6E8] border-[#8C6B1F]/30 shadow-inner"
                            : "bg-transparent border-transparent hover:bg-[#FAF6E8]/60 hover:border-[#E6E1D3]"
                        }`}
                      >
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white border border-[#E6E1D3] shrink-0">
                          <img
                            src={doc.profileImageUrl || "/avatars/avatar2.svg"}
                            alt={doc.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block text-[11px] font-bold truncate ${isSelected ? "text-[#8C6B1F]" : "text-[#4D493E] group-hover:text-[#1C1B18]"}`}>
                            Dr. {doc.fullName}
                          </span>
                          <span className="block text-[9px] text-[#A8A28E] truncate">{doc.specialization}</span>
                        </div>
                        {isSelected && (
                          <MaterialIcon name="chevron_right" className="text-sm text-[#8C6B1F] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* MAIN CHAT PANE */}
          <div className="flex-1 flex flex-col min-w-0">
            {noDoctorAssigned ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-gradient-to-b from-[#FAF9F5] to-white">
                <div className="w-20 h-20 rounded-full bg-[#FAF6E8] border-2 border-[#E6E1D3] flex items-center justify-center mb-5 shadow-inner">
                  <MaterialIcon name="person_add" className="text-4xl text-[#8C6B1F]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#1C1B18] mb-2">No Doctor Linked Yet</h3>
                <p className="text-xs text-[#787363] max-w-xs leading-relaxed mb-6">
                  You must add a certified physician to your care team before you can exchange clinical messages.
                </p>
                <button
                  onClick={() => router.push("/manage-doctors")}
                  className="px-6 py-3 bg-[#1C1B18] text-white hover:bg-[#8C6B1F] rounded-2xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
                >
                  <MaterialIcon name="medical_services" className="text-sm" />
                  <span>Browse Doctors Directory</span>
                </button>
              </div>
            ) : isDoctor && !patientIdParam ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-gradient-to-b from-[#FAF9F5] to-white">
                <div className="w-20 h-20 rounded-full bg-[#FAF6E8] border-2 border-[#E6E1D3] flex items-center justify-center mb-5">
                  <MaterialIcon name="question_answer" className="text-4xl text-[#8C6B1F]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#1C1B18] mb-2">Select a Patient</h3>
                <p className="text-xs text-[#787363] max-w-xs leading-relaxed">
                  Choose a patient from the directory on the left to open their dedicated consultation channel.
                </p>
              </div>
            ) : chatLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <svg className="animate-spin h-8 w-8 text-[#8C6B1F] mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-[#787363]">Decrypting conversation logs...</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF0E6]">
                <MaterialIcon name="error_outline" className="text-4xl text-[#B34515] mb-3" />
                <p className="text-xs font-bold text-[#8C2E0B]">{error}</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-[#E6E1D3] flex items-center justify-between bg-[#FAF9F5] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white border border-[#E6E1D3] shrink-0 shadow-xs">
                      <img
                        src={otherUser?.avatar || "/avatars/avatar1.svg"}
                        alt={otherUser?.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1C1B18]">
                          {otherUser?.role === "DOCTOR" ? `Dr. ${otherUser.name}` : otherUser?.name}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <span className="block text-[9px] text-[#787363] uppercase tracking-wide font-bold">
                        {otherUser?.role === "DOCTOR"
                          ? otherUser.specialization || "General Practitioner"
                          : "Patient"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#787363] bg-white border border-[#E6E1D3] px-2.5 py-1 rounded-full">
                      {messages.length} messages
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFAF9]"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#787363] py-10">
                      <div className="w-14 h-14 rounded-full bg-[#FAF6E8] border border-[#E6E1D3] flex items-center justify-center mb-3">
                        <MaterialIcon name="chat_bubble_outline" className="text-2xl text-[#DCD5C5]" />
                      </div>
                      <p className="text-xs font-semibold text-[#1C1B18]">No messages yet</p>
                      <p className="text-[10px] text-[#A8A28E] mt-1">Send a greeting to start the consultation.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === myId;
                      const showDateSep =
                        idx === 0 ||
                        new Date(msg.timestamp).toDateString() !==
                          new Date(messages[idx - 1].timestamp).toDateString();

                      return (
                        <React.Fragment key={idx}>
                          {showDateSep && (
                            <div className="flex items-center gap-3 my-2">
                              <div className="flex-1 h-px bg-[#E6E1D3]" />
                              <span className="text-[8px] font-bold uppercase tracking-widest text-[#A8A28E] bg-[#FAF9F5] px-2 py-0.5 rounded-full border border-[#E6E1D3]">
                                {new Date(msg.timestamp).toLocaleDateString([], {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <div className="flex-1 h-px bg-[#E6E1D3]" />
                            </div>
                          )}
                          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {!isMe && (
                              <span className="text-[8px] font-bold text-[#787363] mb-1 px-1">
                                {msg.senderRole === "DOCTOR"
                                  ? `Dr. ${otherUser?.name}`
                                  : otherUser?.name}
                              </span>
                            )}
                            <div
                              className={`px-4 py-3 text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-xs max-w-[75%] ${
                                isMe
                                  ? "bg-[#1C1B18] text-white rounded-2xl rounded-tr-none"
                                  : msg.senderRole === "DOCTOR"
                                  ? "bg-[#EAF3FB] text-[#1C5396] border border-[#C8DEF5] rounded-2xl rounded-tl-none"
                                  : "bg-[#FAF6E8] text-[#8C6B1F] border border-[#EEE0C0] rounded-2xl rounded-tl-none"
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[8px] text-[#A8A28E] mt-1 px-1">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="px-5 py-4 border-t border-[#E6E1D3] bg-white flex gap-3 shrink-0"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isDoctor
                        ? "Type a clinical note or update for this patient..."
                        : "Ask your doctor a question or share a symptom update..."
                    }
                    disabled={sending}
                    className="flex-1 px-4 py-3 bg-[#FAF9F5] border border-[#DCD5C5] rounded-xl text-xs font-semibold placeholder-[#A8A28E] focus:outline-none focus:ring-2 focus:ring-[#8C6B1F]/25 focus:border-[#8C6B1F] disabled:opacity-50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="px-5 py-3 bg-[#1C1B18] hover:bg-[#8C6B1F] text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-xs hover:shadow-md"
                  >
                    {sending ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <MaterialIcon name="send" className="text-sm" />
                    )}
                    <span className="hidden sm:inline">{sending ? "Sending..." : "Send"}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
          <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold text-[#787363]">Assembling physician console...</span>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

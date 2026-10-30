"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import Image from "next/image";

interface Doctor {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
  specialization: string | null;
  hospitalAffiliation: string | null;
  yearsExperience: number | null;
  bio: string | null;
  isAssociated: boolean;
  isActive: boolean;
}

export default function ManageDoctorsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Redirect if not authenticated, or onboarding is incomplete, or user is not a patient
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

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/patient/doctors");
      if (!resp.ok) {
        throw new Error("Failed to retrieve clinician list.");
      }
      const data = await resp.json();
      setDoctors(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while loading clinicians.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "PATIENT") {
      fetchDoctors();
    }
  }, [status, session]);

  const handleAddDoctor = async (doctorId: string) => {
    setActionLoadingId(doctorId);
    try {
      const resp = await fetch("/api/patient/doctors/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ doctorId }),
      });
      if (!resp.ok) {
        throw new Error("Failed to add doctor.");
      }
      await fetchDoctors();
    } catch (err: any) {
      alert(err.message || "Operation failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (doctorId: string, nextActiveState: boolean) => {
    setActionLoadingId(doctorId);
    try {
      const resp = await fetch("/api/patient/doctors/toggle-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ doctorId, isActive: nextActiveState }),
      });
      if (!resp.ok) {
        throw new Error("Failed to update status.");
      }
      await fetchDoctors();
    } catch (err: any) {
      alert(err.message || "Operation failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] justify-center items-center font-sans">
        <svg className="animate-spin h-10 w-10 text-[#8C6B1F] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-[#787363]">Retrieving Hippo Medical Directory...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  // Filter based on search query
  const filteredDoctors = doctors.filter((doc) => {
    return (
      doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.hospitalAffiliation && doc.hospitalAffiliation.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const myCareTeam = filteredDoctors.filter((doc) => doc.isAssociated);
  const otherDoctors = filteredDoctors.filter((doc) => !doc.isAssociated);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#1C1B18]">
      <HeaderNav />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#FAF9F5] border border-[#E6E1D3] p-6 rounded-[32px] gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6E8] border border-[#E6E1D3] flex items-center justify-center">
              <MaterialIcon name="medical_services" className="text-2xl text-[#8C6B1F]" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#1C1B18] leading-tight">Manage My Doctors</h1>
              <p className="text-xs text-[#787363] font-sans mt-0.5">Add physicians to your clinical circle and toggle access controls</p>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#787363]">
              <MaterialIcon name="search" className="text-lg" />
            </span>
            <input
              type="text"
              placeholder="Search by name, specialty, clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] text-xs font-semibold font-sans"
            />
          </div>
        </div>

        {error && (
          <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-5 rounded-[24px] text-center font-sans">
            <MaterialIcon name="error" className="text-2xl text-[#B34515] mb-2" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        {/* Section 1: My Care Team */}
        <section className="space-y-4">
          <div className="border-b border-[#E6E1D3] pb-2">
            <h2 className="font-serif text-xl font-bold text-[#1C1B18]">My Care Team</h2>
            <p className="text-xs text-[#787363] font-sans mt-0.5">Doctors with access to your reports and disease diagnostics. You can temporarily toggle access on or off.</p>
          </div>

          {myCareTeam.length === 0 ? (
            <div className="py-12 text-center border border-[#E6E1D3] rounded-[32px] bg-white text-[#787363] font-sans">
              <MaterialIcon name="personal_injury" className="text-4xl text-[#DCD5C5] mb-2" />
              <p className="text-xs font-semibold">You haven&apos;t added any doctors to your care team yet.</p>
              <p className="text-[10px] text-[#A8A28E] mt-1">Browse the directory below to link your profile with a medical professional.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCareTeam.map((doc) => (
                <div
                  key={doc.profileId}
                  className={`bg-white border rounded-[32px] p-5 shadow-2xs transition-all relative flex flex-col justify-between ${
                    doc.isActive ? "border-[#8C6B1F]/30" : "border-[#E6E1D3] opacity-75"
                  }`}
                >
                  <div>
                    {/* Header info */}
                    <div className="flex gap-4">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#FAF6E8] border border-[#E6E1D3] shrink-0">
                        <Image
                          src={doc.profileImageUrl || "/avatars/avatar1.svg"}
                          alt={doc.fullName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif text-base font-bold text-[#1C1B18]">Dr. {doc.fullName}</span>
                          {doc.isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active connection" />
                          )}
                        </div>
                        <p className="text-xs font-bold text-[#8C6B1F] truncate mt-0.5">{doc.specialization || "General Practitioner"}</p>
                        <p className="text-[10px] text-[#787363] truncate mt-0.5">
                          {doc.hospitalAffiliation || "Independent Practice"} • {doc.yearsExperience || 0} yrs exp
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    {doc.bio && (
                      <p className="text-xs text-[#787363] mt-4 font-sans line-clamp-2 leading-relaxed bg-[#FAF9F5] p-3 rounded-2xl border border-[#FAF6E8]">
                        &quot;{doc.bio}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-4 border-t border-[#FAF6E8] flex justify-between items-center">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border font-sans ${
                      doc.isActive 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                      {doc.isActive ? "Access: ON" : "Access: OFF"}
                    </span>

                    <div className="flex gap-2">
                      <button
                        disabled={actionLoadingId === doc.profileId}
                        onClick={() => handleToggleActive(doc.profileId, !doc.isActive)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer font-sans ${
                          doc.isActive
                            ? "bg-[#FAF0E6] text-[#B34515] hover:bg-[#B34515] hover:text-white"
                            : "bg-[#1C1B18] text-white hover:bg-[#8C6B1F]"
                        }`}
                      >
                        {actionLoadingId === doc.profileId 
                          ? "Loading..." 
                          : doc.isActive 
                          ? "Deactivate Access" 
                          : "Activate Access"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Medical Directory (Add New Clinicians) */}
        <section className="space-y-4">
          <div className="border-b border-[#E6E1D3] pb-2">
            <h2 className="font-serif text-xl font-bold text-[#1C1B18]">Add New Doctors</h2>
            <p className="text-xs text-[#787363] font-sans mt-0.5">Find other certified medical practitioners registered on Hippo Health and add them to your care network.</p>
          </div>

          {otherDoctors.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#787363] font-sans">
              No additional clinicians found in the registry matching your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherDoctors.map((doc) => (
                <div
                  key={doc.profileId}
                  className="bg-white border border-[#E6E1D3] rounded-[32px] p-5 shadow-2xs flex flex-col justify-between hover:border-[#8C6B1F]/30 transition-all"
                >
                  <div className="flex gap-4">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#FAF6E8] border border-[#E6E1D3] shrink-0">
                      <Image
                        src={doc.profileImageUrl || "/avatars/avatar1.svg"}
                        alt={doc.fullName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-serif text-base font-bold text-[#1C1B18]">Dr. {doc.fullName}</span>
                      <p className="text-xs font-bold text-[#8C6B1F] truncate mt-0.5">{doc.specialization || "General Practitioner"}</p>
                      <p className="text-[10px] text-[#787363] truncate mt-0.5">
                        {doc.hospitalAffiliation || "Independent Practice"} • {doc.yearsExperience || 0} yrs exp
                      </p>
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-xs text-[#787363] mt-4 font-sans line-clamp-2 leading-relaxed bg-[#FAF9F5] p-3 rounded-2xl border border-[#FAF6E8]">
                      &quot;{doc.bio}&quot;
                    </p>
                  )}

                  <div className="mt-5 pt-4 border-t border-[#FAF6E8] flex justify-end">
                    <button
                      disabled={actionLoadingId === doc.profileId}
                      onClick={() => handleAddDoctor(doc.profileId)}
                      className="px-4 py-2 bg-[#1C1B18] text-white hover:bg-[#8C6B1F] rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer font-sans flex items-center gap-1.5"
                    >
                      {actionLoadingId === doc.profileId ? (
                        "Adding..."
                      ) : (
                        <>
                          <MaterialIcon name="add" className="text-xs" />
                          <span>Add to Care Team</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer />
    </div>
  );
}

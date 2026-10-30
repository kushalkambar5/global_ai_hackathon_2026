"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function OnboardingPage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.onboardingComplete) {
      router.push("/");
    }
  }, [status, session, router]);

  // General fields
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  
  // Avatar selection
  const defaultAvatars = [
    "/avatars/avatar1.svg",
    "/avatars/avatar2.svg",
    "/avatars/avatar3.svg",
    "/avatars/avatar4.svg",
  ];
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatars[0]);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Role-specific fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");
  const [hospitalAffiliation, setHospitalAffiliation] = useState("");

  // Patient fields: Doctor selection
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchDoctor, setSearchDoctor] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill fullName from session
  useEffect(() => {
    if (session?.user?.name) {
      setFullName(session.user.name);
    }
  }, [session]);

  // Load doctors if user is PATIENT
  useEffect(() => {
    if (session?.user?.role === "PATIENT") {
      setLoadingDoctors(true);
      fetch("/api/doctors")
        .then((res) => res.json())
        .then((data) => {
          setDoctors(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error("Error loading doctors", err))
        .finally(() => setLoadingDoctors(false));
    }
  }, [session]);

  // Handle custom image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    setError("");
    // Basic validation per step
    if (step === 1) {
      if (!fullName) {
        setError("Please enter your name.");
        return;
      }
      if (!dob) {
        setError("Please enter your date of birth.");
        return;
      }
      if (!gender) {
        setError("Please select a gender.");
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    // Final checks
    if (session?.user?.role === "DOCTOR" && !licenseNumber) {
      setError("Medical license number is required.");
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("dob", dob);
      formData.append("gender", gender);
      formData.append("bloodGroup", bloodGroup);
      formData.append("heightCm", heightCm);
      formData.append("weightKg", weightKg);
      formData.append("emergencyContact", emergencyContact);

      if (customImage) {
        formData.append("profileImage", customImage);
      } else {
        formData.append("defaultIcon", selectedAvatar);
      }

      if (session?.user?.role === "PATIENT" && selectedDoctorId) {
        formData.append("selectedDoctorId", selectedDoctorId);
      }

      if (session?.user?.role === "DOCTOR") {
        formData.append("licenseNumber", licenseNumber);
        formData.append("specialization", specialization);
        formData.append("yearsExperience", yearsExperience);
        formData.append("bio", bio);
        formData.append("hospitalAffiliation", hospitalAffiliation);
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save onboarding details.");
      }

      // Update NextAuth Session to trigger onboardingComplete = true
      await update({
        onboardingComplete: true,
        name: fullName,
        picture: data.user.profileImageUrl || selectedAvatar,
      });

      // Redirect home
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving profile details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-[#8C6B1F]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[#4D493E] font-medium">Checking authentication state...</span>
        </div>
      </div>
    );
  }

  const filteredDoctors = doctors.filter((doc) =>
    doc.fullName.toLowerCase().includes(searchDoctor.toLowerCase()) ||
    doc.specialization?.toLowerCase().includes(searchDoctor.toLowerCase())
  );

  const roleLabel = session?.user?.role || "USER";

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1C1B18] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="max-w-xl w-full bg-[#FAF9F5] border border-[#E6E1D3] p-8 sm:p-10 rounded-3xl shadow-md relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F4E071]/15 rounded-full blur-2xl pointer-events-none" />
        
        {/* Title */}
        <div className="mb-8">
          <span className="text-[10px] font-sans font-bold tracking-widest text-[#8C6B1F] uppercase">
            Onboarding • Step {step} of 3
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1C1B18] mt-1">
            Complete Your Profile
          </h1>
          <p className="text-sm text-[#787363] mt-1">
            Help us personalize your Hippo Health dashboard.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#EBE6D8] h-1.5 rounded-full overflow-hidden mb-8">
          <div
            className="bg-[#8C6B1F] h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-6 bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-4 rounded-xl flex items-start gap-3 text-sm">
            <MaterialIcon name="warning" className="text-xl shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Basic Health Details */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-semibold text-[#1C1B18] border-b border-[#E6E1D3] pb-2">
              Step 1: Core Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                  placeholder="Enter full name"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                  placeholder="e.g. 175"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                  placeholder="e.g. 70"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-[#1C1B18] hover:bg-[#2E2C26] text-white font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <span>Continue</span>
                <MaterialIcon name="arrow_forward" className="text-lg" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Emergency Contact & Profile Avatar */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-semibold text-[#1C1B18] border-b border-[#E6E1D3] pb-2">
              Step 2: Emergency Contact & Photo
            </h2>

            {/* Emergency Contact */}
            <div>
              <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                Emergency Contact Phone Number
              </label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                placeholder="e.g. +1 555-0199"
              />
            </div>

            {/* Profile Avatar Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-3">
                Choose Profile Icon or Upload Custom Image
              </label>

              {/* Default Avatar Carousel / Grid */}
              <div className="flex gap-4 mb-4">
                {defaultAvatars.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(url);
                      setCustomImage(null);
                      setImagePreview(null);
                    }}
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all p-1 cursor-pointer bg-white flex items-center justify-center ${
                      selectedAvatar === url && !customImage
                        ? "border-[#8C6B1F] scale-105 shadow-sm bg-[#FAF6E8]"
                        : "border-[#E6E1D3] hover:border-[#DCD5C5]"
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`Default avatar ${i + 1}`}
                      fill
                      className="object-contain p-1"
                    />
                  </button>
                ))}
              </div>

              {/* Custom Upload */}
              <div className="mt-4 border border-dashed border-[#DCD5C5] p-5 rounded-2xl bg-white text-center">
                <input
                  type="file"
                  id="profile-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#DCD5C5] p-1 bg-white">
                      <Image
                        src={imagePreview}
                        alt="Uploaded preview"
                        fill
                        className="object-cover rounded-xl"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomImage(null);
                        setImagePreview(null);
                      }}
                      className="text-xs text-red-600 font-semibold underline"
                    >
                      Remove Custom Photo
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="profile-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F6F4EF] flex items-center justify-center text-[#787363] group-hover:bg-[#FAF6E8] transition-colors">
                      <MaterialIcon name="upload" className="text-xl" />
                    </div>
                    <span className="text-xs font-semibold text-[#8C6B1F] group-hover:text-[#705619]">
                      Upload Custom profile image
                    </span>
                    <span className="text-[10px] text-[#A8A28E]">
                      PNG, JPG or SVG (Max 5MB)
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-3 border border-[#DCD5C5] hover:bg-[#F0EDE4] text-[#4D493E] font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <MaterialIcon name="arrow_back" className="text-lg" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-[#1C1B18] hover:bg-[#2E2C26] text-white font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <span>Continue</span>
                <MaterialIcon name="arrow_forward" className="text-lg" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Role-Specific Selection */}
        {step === 3 && (
          <div className="space-y-6">
            {roleLabel === "PATIENT" ? (
              <>
                <h2 className="font-serif text-xl font-semibold text-[#1C1B18] border-b border-[#E6E1D3] pb-2">
                  Step 3: Select Clinical Doctor
                </h2>
                <p className="text-xs text-[#787363]">
                  Link your profile with a doctor registered on Hippo Health to receive verified prescriptions, logs, and advice.
                </p>

                {/* Search box */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#787363]">
                    <MaterialIcon name="search" className="text-lg" />
                  </span>
                  <input
                    type="text"
                    value={searchDoctor}
                    onChange={(e) => setSearchDoctor(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                    placeholder="Search doctors by name or specialization..."
                  />
                </div>

                {/* Doctors List */}
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin border border-[#E6E1D3] rounded-2xl p-4 bg-white">
                  {loadingDoctors ? (
                    <div className="text-center py-6 text-sm text-[#787363]">
                      Loading doctors list...
                    </div>
                  ) : filteredDoctors.length === 0 ? (
                    <div className="text-center py-6 text-sm text-[#787363]">
                      No doctors found matching that search.
                    </div>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <button
                        key={doc.profileId}
                        type="button"
                        onClick={() => setSelectedDoctorId(doc.profileId)}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-4 transition-all cursor-pointer ${
                          selectedDoctorId === doc.profileId
                            ? "bg-[#FAF6E8] border-[#8C6B1F] ring-1 ring-[#8C6B1F]"
                            : "bg-white border-[#E6E1D3] hover:border-[#DCD5C5]"
                        }`}
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#FAF6E8] shrink-0 border border-[#E6E1D3]">
                          <Image
                            src={doc.profileImageUrl || "/avatars/avatar1.svg"}
                            alt={doc.fullName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1C1B18] truncate">
                            Dr. {doc.fullName}
                          </p>
                          <p className="text-xs text-[#8C6B1F] font-medium truncate mt-0.5">
                            {doc.specialization || "General Medicine"}
                          </p>
                          <p className="text-[10px] text-[#787363] truncate mt-0.5">
                            {doc.hospitalAffiliation || "Independent Practice"} • {doc.yearsExperience || 0} yrs exp
                          </p>
                        </div>
                        {selectedDoctorId === doc.profileId && (
                          <div className="w-6 h-6 rounded-full bg-[#8C6B1F] text-white flex items-center justify-center shrink-0">
                            <MaterialIcon name="check" className="text-sm" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-xl font-semibold text-[#1C1B18] border-b border-[#E6E1D3] pb-2">
                  Step 3: Medical License & Practitioner Details
                </h2>

                <div className="space-y-4">
                  {/* License Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                      Medical License Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                      placeholder="e.g. LIC-998877"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Specialization */}
                    <div>
                      <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                        Specialization Area
                      </label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                        placeholder="e.g. Cardiology"
                      />
                    </div>

                    {/* Years of Experience */}
                    <div>
                      <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                        placeholder="e.g. 8"
                      />
                    </div>
                  </div>

                  {/* Hospital Affiliation */}
                  <div>
                    <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                      Hospital Affiliation
                    </label>
                    <input
                      type="text"
                      value={hospitalAffiliation}
                      onChange={(e) => setHospitalAffiliation(e.target.value)}
                      className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm"
                      placeholder="e.g. Hippo General Hospital"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                      Short Bio / Statement
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="block w-full px-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm font-sans"
                      placeholder="Share a brief introduction about your medical practice..."
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                disabled={submitting}
                className="px-5 py-3 border border-[#DCD5C5] hover:bg-[#F0EDE4] text-[#4D493E] font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <MaterialIcon name="arrow_back" className="text-lg" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-[#1C1B18] hover:bg-[#2E2C26] text-white font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Saving Profile...</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Complete Onboarding</span>
                    <MaterialIcon name="done" className="text-lg" />
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
      router.push("/dashboard");
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
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Helpers for date limits (range of 0 to 150 years old)
  const todayObj = new Date();
  const maxDateStr = todayObj.toISOString().split("T")[0];
  const minDateObj = new Date(todayObj.getFullYear() - 150, todayObj.getMonth(), todayObj.getDate());
  const minDateStr = minDateObj.toISOString().split("T")[0];

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

  // Calculate Age details helper
  const calculateAgeDetails = (dobStr: string) => {
    if (!dobStr) return null;
    const parts = dobStr.split("-");
    if (parts.length !== 3) {
      return { age: null, valid: false, error: "Invalid date format." };
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { age: null, valid: false, error: "Invalid date format." };
    }

    const birthDate = new Date(year, month, day);
    // JavaScript's new Date(year, month, day) maps 2-digit/1-digit years (0-99) to 1900-1999.
    // Call setFullYear to accurately reflect years 0000-0099 (e.g. 0001 AD).
    if (year >= 0 && year <= 99) {
      birthDate.setFullYear(year);
    }

    if (isNaN(birthDate.getTime())) {
      return { age: null, valid: false, error: "Invalid date format." };
    }

    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const birthZero = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    if (birthZero > todayZero) {
      return { age: null, valid: false, error: "Date of birth cannot be in the future (age must be between 0 and 150)." };
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 0) {
      return { age: null, valid: false, error: "Date of birth cannot be in the future (age must be between 0 and 150)." };
    }
    if (age > 150) {
      return { age, valid: false, error: "Age must be realistic (between 0 and 150 years)." };
    }

    return { age, valid: true, error: null };
  };

  // Calculate live BMI
  const calculateBmiPreview = (heightStr: string, weightStr: string) => {
    const h = parseFloat(heightStr);
    const w = parseFloat(weightStr);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0 || h < 30 || h > 300 || w < 1 || w > 500) {
      return null;
    }
    const bmi = w / Math.pow(h / 100, 2);
    let category = "Normal weight";
    let badgeClass = "text-[#137333] bg-[#E6F4EA] border-[#C2E7CD]";

    if (bmi < 18.5) {
      category = "Underweight";
      badgeClass = "text-[#B06000] bg-[#FEF7E0] border-[#FCE8B2]";
    } else if (bmi >= 25 && bmi < 30) {
      category = "Overweight";
      badgeClass = "text-[#B06000] bg-[#FEF7E0] border-[#FCE8B2]";
    } else if (bmi >= 30) {
      category = "Obesity";
      badgeClass = "text-[#C5221F] bg-[#FCE8E6] border-[#FAD2CF]";
    }

    return { bmi: bmi.toFixed(1), category, badgeClass };
  };

  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
    if (error) setError("");
  };

  // Handle custom image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file (PNG, JPG, SVG, WebP).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image file size must be less than 5MB.");
        return;
      }
      setError("");
      setCustomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const errors: { [key: string]: string } = {};

    if (stepNumber === 1) {
      const trimmedName = fullName.trim();
      if (!trimmedName) {
        errors.fullName = "Full name is required.";
      } else if (trimmedName.length < 2) {
        errors.fullName = "Full name must be at least 2 characters.";
      } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
        errors.fullName = "Full name contains invalid characters.";
      }

      if (!dob) {
        errors.dob = "Date of birth is required.";
      } else {
        const ageInfo = calculateAgeDetails(dob);
        if (!ageInfo || !ageInfo.valid) {
          errors.dob = ageInfo?.error || "Please enter a valid date of birth.";
        }
      }

      if (!gender) {
        errors.gender = "Please select a gender.";
      } else if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
        errors.gender = "Invalid gender selection.";
      }

      const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      if (bloodGroup && !validBloodGroups.includes(bloodGroup)) {
        errors.bloodGroup = "Please select a valid blood group.";
      }

      if (heightCm) {
        const h = parseFloat(heightCm);
        if (isNaN(h) || h <= 0) {
          errors.heightCm = "Height must be a positive number greater than 0.";
        } else if (h < 30 || h > 300) {
          errors.heightCm = "Height must be a realistic human height (30 cm to 300 cm).";
        }
      }

      if (weightKg) {
        const w = parseFloat(weightKg);
        if (isNaN(w) || w <= 0) {
          errors.weightKg = "Weight must be a positive number greater than 0.";
        } else if (w < 1 || w > 500) {
          errors.weightKg = "Weight must be a realistic human weight (1 kg to 500 kg).";
        }
      }
    }

    if (stepNumber === 2) {
      if (emergencyContact.trim()) {
        const phoneRegex = /^(\+?[0-9\s\-()]{7,20})$/;
        if (!phoneRegex.test(emergencyContact.trim())) {
          errors.emergencyContact = "Please enter a valid emergency contact phone number (at least 7 digits).";
        }
      }
    }

    if (stepNumber === 3) {
      if (session?.user?.role === "DOCTOR") {
        const trimmedLicense = licenseNumber.trim();
        if (!trimmedLicense) {
          errors.licenseNumber = "Medical license number is required.";
        } else if (trimmedLicense.length < 3) {
          errors.licenseNumber = "License number must be at least 3 characters.";
        }

        if (yearsExperience) {
          const exp = parseInt(yearsExperience, 10);
          if (isNaN(exp) || exp < 0) {
            errors.yearsExperience = "Years of experience cannot be negative.";
          } else if (exp > 70) {
            errors.yearsExperience = "Years of experience cannot exceed 70.";
          } else {
            const ageInfo = calculateAgeDetails(dob);
            if (ageInfo?.age !== null && ageInfo?.age !== undefined && ageInfo.age - 18 < exp) {
              errors.yearsExperience = `Experience cannot exceed ${Math.max(0, ageInfo.age - 18)} years based on your age.`;
            }
          }
        }
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError("");
    if (!validateStep(step)) {
      return;
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setError("");

    // Validate all steps before submitting
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("dob", dob);
      formData.append("gender", gender);
      if (bloodGroup) formData.append("bloodGroup", bloodGroup);
      if (heightCm) formData.append("heightCm", parseFloat(heightCm).toString());
      if (weightKg) formData.append("weightKg", parseFloat(weightKg).toString());
      if (emergencyContact.trim()) formData.append("emergencyContact", emergencyContact.trim());

      if (customImage) {
        formData.append("profileImage", customImage);
      } else {
        formData.append("defaultIcon", selectedAvatar);
      }

      if (session?.user?.role === "PATIENT" && selectedDoctorId) {
        formData.append("selectedDoctorId", selectedDoctorId);
      }

      if (session?.user?.role === "DOCTOR") {
        formData.append("licenseNumber", licenseNumber.trim());
        formData.append("specialization", specialization.trim());
        formData.append("yearsExperience", yearsExperience ? parseInt(yearsExperience, 10).toString() : "0");
        formData.append("bio", bio.trim());
        formData.append("hospitalAffiliation", hospitalAffiliation.trim());
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
        name: fullName.trim(),
        picture: data.user.profileImageUrl || selectedAvatar,
      });

      // Redirect to dashboard
      router.push("/dashboard");
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
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearFieldError("fullName");
                  }}
                  className={`block w-full px-4 py-3 bg-white border ${
                    fieldErrors.fullName ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                  placeholder="Enter full name"
                />
                {fieldErrors.fullName && (
                  <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                    <MaterialIcon name="error" className="text-sm" />
                    <span>{fieldErrors.fullName}</span>
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  max={maxDateStr}
                  min={minDateStr}
                  value={dob}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDob(value);
                    if (value) {
                      const ageInfo = calculateAgeDetails(value);
                      if (ageInfo && !ageInfo.valid) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          dob: ageInfo.error || "Age must be realistic (between 0 and 150 years).",
                        }));
                      } else {
                        clearFieldError("dob");
                      }
                    } else {
                      clearFieldError("dob");
                    }
                  }}
                  className={`block w-full px-4 py-3 bg-white border ${
                    fieldErrors.dob ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                />
                {(() => {
                  const ageInfo = calculateAgeDetails(dob);
                  if (fieldErrors.dob) {
                    return (
                      <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                        <MaterialIcon name="error" className="text-sm" />
                        <span>{fieldErrors.dob}</span>
                      </p>
                    );
                  }
                  if (ageInfo) {
                    if (ageInfo.valid) {
                      return (
                        <p className="mt-1.5 text-xs font-medium text-[#137333] flex items-center gap-1">
                          <MaterialIcon name="cake" className="text-sm text-[#137333]" />
                          <span>Calculated Age: <strong>{ageInfo.age} {ageInfo.age === 1 ? "year" : "years"} old</strong></span>
                        </p>
                      );
                    } else {
                      return (
                        <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                          <MaterialIcon name="warning" className="text-sm" />
                          <span>{ageInfo.error}</span>
                        </p>
                      );
                    }
                  }
                  return null;
                })()}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    clearFieldError("gender");
                  }}
                  className={`block w-full px-4 py-3 bg-white border ${
                    fieldErrors.gender ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {fieldErrors.gender && (
                  <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                    <MaterialIcon name="error" className="text-sm" />
                    <span>{fieldErrors.gender}</span>
                  </p>
                )}
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => {
                    setBloodGroup(e.target.value);
                    clearFieldError("bloodGroup");
                  }}
                  className={`block w-full px-4 py-3 bg-white border ${
                    fieldErrors.bloodGroup ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
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
                {fieldErrors.bloodGroup && (
                  <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                    <MaterialIcon name="error" className="text-sm" />
                    <span>{fieldErrors.bloodGroup}</span>
                  </p>
                )}
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  value={heightCm}
                  onChange={(e) => {
                    setHeightCm(e.target.value);
                    clearFieldError("heightCm");
                  }}
                  className={`block w-full px-4 py-3 bg-white border ${
                    fieldErrors.heightCm ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                  placeholder="e.g. 175"
                />
                {fieldErrors.heightCm && (
                  <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                    <MaterialIcon name="error" className="text-sm" />
                    <span>{fieldErrors.heightCm}</span>
                  </p>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="500"
                  value={weightKg}
                  onChange={(e) => {
                    setWeightKg(e.target.value);
                    clearFieldError("weightKg");
                  }}
                  className={`block w-full px-4 py-3 bg-white border ${
                    fieldErrors.weightKg ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                  placeholder="e.g. 70"
                />
                {fieldErrors.weightKg && (
                  <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                    <MaterialIcon name="error" className="text-sm" />
                    <span>{fieldErrors.weightKg}</span>
                  </p>
                )}
              </div>

              {/* Live BMI Indicator */}
              {(() => {
                const bmiPreview = calculateBmiPreview(heightCm, weightKg);
                if (!bmiPreview) return null;
                return (
                  <div className={`sm:col-span-2 p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium font-sans ${bmiPreview.badgeClass}`}>
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="monitor_weight" className="text-lg shrink-0" />
                      <span>Estimated Body Mass Index (BMI): <strong>{bmiPreview.bmi} kg/m²</strong></span>
                    </div>
                    <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md border border-current bg-white/50">
                      {bmiPreview.category}
                    </span>
                  </div>
                );
              })()}
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
                onChange={(e) => {
                  setEmergencyContact(e.target.value);
                  clearFieldError("emergencyContact");
                }}
                className={`block w-full px-4 py-3 bg-white border ${
                  fieldErrors.emergencyContact ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                placeholder="e.g. +1 555-0199"
              />
              {fieldErrors.emergencyContact && (
                <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                  <MaterialIcon name="error" className="text-sm" />
                  <span>{fieldErrors.emergencyContact}</span>
                </p>
              )}
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
                      onChange={(e) => {
                        setLicenseNumber(e.target.value);
                        clearFieldError("licenseNumber");
                      }}
                      className={`block w-full px-4 py-3 bg-white border ${
                        fieldErrors.licenseNumber ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                      } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                      placeholder="e.g. LIC-998877"
                    />
                    {fieldErrors.licenseNumber && (
                      <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                        <MaterialIcon name="error" className="text-sm" />
                        <span>{fieldErrors.licenseNumber}</span>
                      </p>
                    )}
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
                        min="0"
                        max="70"
                        step="1"
                        value={yearsExperience}
                        onChange={(e) => {
                          setYearsExperience(e.target.value);
                          clearFieldError("yearsExperience");
                        }}
                        className={`block w-full px-4 py-3 bg-white border ${
                          fieldErrors.yearsExperience ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                        } rounded-xl text-[#1C1B18] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all text-sm`}
                        placeholder="e.g. 8"
                      />
                      {fieldErrors.yearsExperience && (
                        <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                          <MaterialIcon name="error" className="text-sm" />
                          <span>{fieldErrors.yearsExperience}</span>
                        </p>
                      )}
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

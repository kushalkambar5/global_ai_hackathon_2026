"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.fullName = "Full name is required.";
    } else if (trimmedName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      errors.fullName = "Full name contains invalid characters.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    if (!role || (role !== "PATIENT" && role !== "DOCTOR")) {
      errors.role = "Please select a valid role.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setSuccess(true);
      
      // Auto sign in user
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        // If auto-login fails, send them to login screen
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        // Go straight to onboarding!
        setTimeout(() => {
          router.push("/onboarding");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1C1B18] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-3 group mb-8">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#FAF6E8] p-1 shadow-xs border border-[#E8E2CF] group-hover:scale-105 transition-transform">
          <Image
            src="/logo.png"
            alt="Hippo Health Logo"
            fill
            sizes="40px"
            className="object-contain p-1"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-2xl font-bold tracking-tight text-[#1C1B18] leading-none">
            Hippo<span className="text-[#8C6B1F]">Health</span>
          </span>
          <span className="text-[10px] font-sans font-medium tracking-widest text-[#787363] uppercase mt-0.5">
            Precision Clinical AI
          </span>
        </div>
      </Link>

      <div className="max-w-md w-full space-y-8 bg-[#FAF9F5] p-8 sm:p-10 rounded-3xl border border-[#E6E1D3] shadow-md relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F4E071]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#10B981]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          <h2 className="text-center font-serif text-3xl font-bold tracking-tight text-[#1C1B18]">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-[#787363] font-sans">
            Start your journey with precision medical intelligence.
          </p>
        </div>

        {error && (
          <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-4 rounded-xl flex items-start gap-3 animate-shake font-sans text-sm">
            <MaterialIcon name="warning" className="text-xl text-[#B34515] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        

        <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2 font-sans">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#787363]">
                  <MaterialIcon name="person" className="text-lg" />
                </span>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.fullName;
                        return copy;
                      });
                    }
                  }}
                  disabled={loading || success}
                  className={`block w-full pl-11 pr-4 py-3 bg-white border ${
                    fieldErrors.fullName ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all font-sans text-sm`}
                  placeholder="John Doe"
                />
              </div>
              {fieldErrors.fullName && (
                <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                  <MaterialIcon name="error" className="text-sm" />
                  <span>{fieldErrors.fullName}</span>
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2 font-sans">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#787363]">
                  <MaterialIcon name="mail" className="text-lg" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.email;
                        return copy;
                      });
                    }
                  }}
                  disabled={loading || success}
                  className={`block w-full pl-11 pr-4 py-3 bg-white border ${
                    fieldErrors.email ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all font-sans text-sm`}
                  placeholder="name@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                  <MaterialIcon name="error" className="text-sm" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2 font-sans">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#787363]">
                  <MaterialIcon name="lock" className="text-lg" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.password;
                        return copy;
                      });
                    }
                  }}
                  disabled={loading || success}
                  className={`block w-full pl-11 pr-4 py-3 bg-white border ${
                    fieldErrors.password ? "border-red-500 ring-1 ring-red-500" : "border-[#DCD5C5]"
                  } rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all font-sans text-sm`}
                  placeholder="•••••••• (min. 6 characters)"
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-600 font-sans flex items-center gap-1">
                  <MaterialIcon name="error" className="text-sm" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <span className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider mb-2 font-sans">
                Select Your Role
              </span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("PATIENT")}
                  disabled={loading || success}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                    role === "PATIENT"
                      ? "bg-[#FAF6E8] border-[#8C6B1F] text-[#8C6B1F] ring-1 ring-[#8C6B1F] shadow-xs"
                      : "bg-white border-[#DCD5C5] text-[#787363] hover:bg-[#FDFDFD]"
                  }`}
                >
                  <MaterialIcon name="patient_list" className="text-2xl mb-1.5 pointer-events-none" />
                  <span className="text-sm font-semibold font-sans pointer-events-none">Patient</span>
                  <span className="text-[10px] text-[#787363] font-sans mt-0.5 text-center pointer-events-none">Seek clinical insights & logs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("DOCTOR")}
                  disabled={loading || success}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                    role === "DOCTOR"
                      ? "bg-[#FAF6E8] border-[#8C6B1F] text-[#8C6B1F] ring-1 ring-[#8C6B1F] shadow-xs"
                      : "bg-white border-[#DCD5C5] text-[#787363] hover:bg-[#FDFDFD]"
                  }`}
                >
                  <MaterialIcon name="stethoscope" className="text-2xl mb-1.5 pointer-events-none" />
                  <span className="text-sm font-semibold font-sans pointer-events-none">Doctor</span>
                  <span className="text-[10px] text-[#787363] font-sans mt-0.5 text-center pointer-events-none">Verify AI logs & manage patients</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || success}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#1C1B18] hover:bg-[#2E2C26] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#1C1B18] transition-all disabled:opacity-50 cursor-pointer shadow-sm font-sans"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Sign Up</span>
                  <MaterialIcon name="arrow_forward" className="text-lg text-white" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center font-sans text-sm">
          <span className="text-[#787363]">Already have an account? </span>
          <Link href="/login" className="font-semibold text-[#8C6B1F] hover:text-[#705619] transition-colors underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

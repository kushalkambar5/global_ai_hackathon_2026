"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { signIn, getSession } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Success! Get current session info to determine where to redirect
        const session = await getSession();

        if (session && session.user) {
          if (!session.user.onboardingComplete) {
            router.push("/onboarding");
          } else {
            router.push("/");
          }
          router.refresh();
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-[#FAF9F5] p-8 sm:p-10 rounded-3xl border border-[#E6E1D3] shadow-md relative overflow-hidden">
      {/* Glow decoration */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F4E071]/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#10B981]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative">
        <h2 className="text-center font-serif text-3xl font-bold tracking-tight text-[#1C1B18]">
          Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-[#787363] font-sans">
          Access your health reports and doctor consultations.
        </p>
      </div>

      {error && (
        <div className="bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-4 rounded-xl flex items-start gap-3 animate-shake font-sans text-sm">
          <MaterialIcon name="warning" className="text-xl text-[#B34515] shrink-0 mt-0.5" />
          <span>{error === "CredentialsSignin" ? "Invalid email or password." : error}</span>
        </div>
      )}

      <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
        <div className="space-y-4">
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
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="block w-full pl-11 pr-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all font-sans text-sm"
                placeholder="name@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-xs font-semibold text-[#4D493E] uppercase tracking-wider font-sans">
                Password
              </label>
            </div>
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
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="block w-full pl-11 pr-4 py-3 bg-white border border-[#DCD5C5] rounded-xl text-[#1C1B18] placeholder-[#A8A28E] focus:outline-hidden focus:ring-2 focus:ring-[#8C6B1F]/30 focus:border-[#8C6B1F] transition-all font-sans text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#1C1B18] hover:bg-[#2E2C26] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#1C1B18] transition-all disabled:opacity-50 cursor-pointer shadow-sm font-sans"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                  <span>Verifying...</span>
                </div>
            ) : (
              <span className="flex items-center gap-2">
                <span>Sign In</span>
                <MaterialIcon name="login" className="text-lg text-white" />
              </span>
            )}
          </button>
        </div>
      </form>

      <div className="text-center font-sans text-sm">
        <span className="text-[#787363]">Don&apos;t have an account? </span>
        <Link href="/signup" className="font-semibold text-[#8C6B1F] hover:text-[#705619] transition-colors underline underline-offset-4">
          Sign Up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
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

      <Suspense fallback={
        <div className="max-w-md w-full bg-[#FAF9F5] p-10 rounded-3xl border border-[#E6E1D3] shadow-md flex items-center justify-center font-sans text-[#787363]">
          <svg className="animate-spin h-6 w-6 text-[#8C6B1F] mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading sign in form...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

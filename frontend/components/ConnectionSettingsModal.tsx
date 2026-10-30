"use client";

import React, { useState, useEffect } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionSettingsModal({ isOpen, onClose }: ConnectionSettingsModalProps) {
  const [backendUrl, setBackendUrl] = useState("");
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"idle" | "success" | "error">("idle");
  const [backendError, setBackendError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load from localStorage on mount/open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setBackendUrl(localStorage.getItem("custom_backend_url") || "");
      setBackendStatus("idle");
      setBackendError("");
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window === "undefined") return;

    if (backendUrl.trim()) {
      // Normalize URL (strip trailing slash)
      const formatted = backendUrl.trim().replace(/\/+$/, "");
      localStorage.setItem("custom_backend_url", formatted);
    } else {
      localStorage.removeItem("custom_backend_url");
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
      // Dispatch a storage event or custom event so other components (like HeaderNav) update instantly
      window.dispatchEvent(new Event("connection-settings-updated"));
    }, 1000);
  };

  const handleClear = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("custom_backend_url");
    setBackendUrl("");
    setBackendStatus("idle");
    setBackendError("");
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
      window.dispatchEvent(new Event("connection-settings-updated"));
    }, 1000);
  };

  const testBackendConnection = async () => {
    setTestingBackend(true);
    setBackendStatus("idle");
    setBackendError("");

    const targetUrl = backendUrl.trim() || "http://localhost:5000";

    try {
      // Test the public endpoint '/api/doctors' via the proxy with a temporary header.
      const res = await fetch("/api/doctors", {
        headers: {
          "x-custom-backend-url": targetUrl,
        },
      });

      if (res.ok) {
        setBackendStatus("success");
      } else {
        throw new Error(`HTTP status ${res.status}`);
      }
    } catch (err: any) {
      setBackendStatus("error");
      setBackendError(err.message || "Failed to reach backend");
    } finally {
      setTestingBackend(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[#E6E1D3] mb-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#FAF6E8] flex items-center justify-center border border-[#E8E2CF]">
              <MaterialIcon name="api" className="text-xl text-[#8C6B1F]" />
            </span>
            <h2 className="text-xl font-serif font-bold text-[#1C1B18]">Connection Tunnel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#787363] hover:bg-[#FAF6E8] hover:text-[#1C1B18] transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-amber-900 text-xs leading-relaxed">
          <div className="flex gap-2.5 items-start">
            <MaterialIcon name="info" className="text-base text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Accessing HippoHealth from Vercel</p>
              <p className="text-[#6B5A33]">
                Since Vercel is deployed in the cloud, it cannot access your computer's <code>localhost</code> directly. 
                Use an HTTPS tunnel (like <strong>ngrok</strong>) to expose your local Express backend (port 5000) to the web, and paste the public tunnel URL below. 
                All AI model requests will also route through this tunnel.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Backend API Configuration */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#787363] mb-2">
              Express Backend API URL (Port 5000)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="e.g. https://xxxx.ngrok-free.app (blank for default)"
                  className="w-full px-4 py-3 rounded-xl border border-[#DCD5C5] bg-white text-sm text-[#1C1B18] focus:outline-hidden focus:border-[#8C6B1F] focus:ring-1 focus:ring-[#8C6B1F] transition-all font-mono placeholder:font-sans"
                />
                {backendStatus === "success" && (
                  <span className="absolute right-3 top-3.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                {backendStatus === "error" && (
                  <span className="absolute right-3 top-3.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={testBackendConnection}
                disabled={testingBackend}
                className="px-4 py-2 bg-white border border-[#DCD5C5] hover:bg-[#FAF6E8] text-xs font-semibold text-[#4D493E] rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingBackend ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-[#8C6B1F] border-t-transparent rounded-full" />
                ) : (
                  <>
                    <MaterialIcon name="sensors" className="text-sm" />
                    <span>Test</span>
                  </>
                )}
              </button>
            </div>
            {backendStatus === "success" && (
              <p className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <MaterialIcon name="check_circle" className="text-xs" /> Connected successfully
              </p>
            )}
            {backendStatus === "error" && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                <MaterialIcon name="error" className="text-xs" /> Connection failed: {backendError}
              </p>
            )}
          </div>

          {/* Quick Guide */}
          <div className="p-4 bg-[#FAF6E8] border border-[#E8E2CF] rounded-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1B18] mb-2.5 flex items-center gap-1.5">
              <MaterialIcon name="terminal" className="text-sm" />
              <span>How to start the tunnel locally:</span>
            </h4>
            <ol className="text-[11px] text-[#4D493E] space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Install ngrok and run this command on your host laptop:
                <div className="mt-1.5 p-2 bg-[#F0ECE2] rounded-lg font-mono text-[10px] text-[#1C1B18] space-y-1">
                  <div># Tunnel for Express Backend API (Port 5000)</div>
                  <div className="font-bold text-[#8C6B1F]">ngrok http 5000</div>
                </div>
              </li>
              <li>Copy the generated <strong>Forwarding HTTPS URL</strong> (e.g. <code>https://*.ngrok-free.app</code>).</li>
              <li>Paste it in the input above and hit <strong>Save Settings</strong>.</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E6E1D3]">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-4 py-3 bg-white border border-[#E6E1D3] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-xs font-semibold text-[#787363] rounded-xl transition-all cursor-pointer text-center"
            >
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveSuccess}
              className="flex-1 px-4 py-3 bg-[#1C1B18] hover:bg-[#2E2C26] disabled:bg-emerald-600 disabled:opacity-90 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <MaterialIcon name="check" className="text-sm" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

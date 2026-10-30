"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session, update } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const currentAvatar =
    previewUrl ||
    session?.user?.image ||
    (session?.user as any)?.picture ||
    "/avatars/avatar1.svg";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file (PNG, JPG, WEBP).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size should be under 10MB.");
        return;
      }
      setError("");
      setSuccessMsg("");
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/user/profile-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to upload profile picture.");
      }

      const r2Url = data.profileImageUrl;

      // Update NextAuth Session with new profile picture URL
      await update({
        picture: r2Url,
        image: r2Url,
      });

      setSuccessMsg("Profile picture successfully uploaded to Cloudflare R2!");
      setSelectedFile(null);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans animate-fade-in">
      <div
        className="w-full max-w-md bg-[#FAF9F5] border border-[#E6E1D3] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[#E6E1D3]">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8C6B1F] bg-[#FAF6E8] border border-[#E6E1D3] px-2.5 py-0.5 rounded-full uppercase">
              Cloudflare R2 Storage
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#1C1B18] mt-1">
              Update Profile Picture
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#DCD5C5] hover:bg-[#EBE6D8] flex items-center justify-center text-[#787363] hover:text-[#1C1B18] transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-lg" />
          </button>
        </div>

        {/* Current Avatar Display */}
        <div className="py-6 flex flex-col items-center gap-4">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md bg-[#FAF6E8]">
            <Image
              src={currentAvatar}
              alt={session?.user?.name || "User avatar"}
              fill
              className="object-cover"
            />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-[#1C1B18] text-base">
              {session?.user?.name || "User"}
            </h3>
            <p className="text-xs text-[#787363]">{session?.user?.email}</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-[#FAF0E6] border border-[#F2C5B0] text-[#8C2E0B] p-3 rounded-xl flex items-center gap-2 text-xs font-medium">
            <MaterialIcon name="warning" className="text-base shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] p-3 rounded-xl flex items-center gap-2 text-xs font-medium">
            <MaterialIcon name="check_circle" className="text-base shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Custom File Upload Box */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4D493E] mb-2">
            Select Photo to Upload
          </label>
          <div className="border-2 border-dashed border-[#DCD5C5] hover:border-[#8C6B1F] bg-white p-5 rounded-2xl text-center transition-colors">
            <input
              type="file"
              id="profile-r2-upload"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="profile-r2-upload"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#FAF6E8] flex items-center justify-center text-[#8C6B1F]">
                <MaterialIcon name="cloud_upload" className="text-xl" />
              </div>
              <span className="text-xs font-bold text-[#8C6B1F]">
                {selectedFile ? selectedFile.name : "Choose Photo to Upload"}
              </span>
              <span className="text-[10px] text-[#787363]">
                Supports PNG, JPG, WEBP • Max 10MB
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[#E6E1D3]">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl border border-[#DCD5C5] text-xs font-semibold text-[#4D493E] hover:bg-[#EBE6D8] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-5 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#2E2C26] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Uploading to R2...</span>
              </>
            ) : (
              <>
                <MaterialIcon name="upload" className="text-base" />
                <span>Upload Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

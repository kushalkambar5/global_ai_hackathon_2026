"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { LanyardProps } from "./Lanyard";

const LanyardComponent = dynamic(() => import("./Lanyard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-[#8C6B1F]/60 animate-pulse">
      Loading 3D Lanyard...
    </div>
  )
});

export default function LanyardWrapper(props: LanyardProps) {
  return <LanyardComponent {...props} />;
}

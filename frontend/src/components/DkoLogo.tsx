"use client";

import React from "react";
import Image from "next/image";

interface DkoLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "stacked";
  showSubtitle?: boolean;
  className?: string;
}

export default function DkoLogo({
  size = "md",
  variant = "full",
  showSubtitle = true,
  className = "",
}: DkoLogoProps) {
  const dimensions = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  return (
    <div className={`relative inline-flex shrink-0 select-none ${dimensions[size]} ${className}`}>
      <Image
        src="/logo.png"
        alt="Digital Krishi Officer"
        fill
        priority={size === "lg"}
        className="object-contain"
      />
    </div>
  );
}

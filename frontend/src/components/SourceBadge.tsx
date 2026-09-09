"use client";

interface SourceBadgeProps {
  label: string;
  color: string;
}

export default function SourceBadge({ label, color = "#15803D" }: SourceBadgeProps) {
  const isHex = typeof color === "string" && color.startsWith("#");

  if (!isHex && color) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default border ${color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {label}
      </span>
    );
  }

  const hexColor = isHex ? color : "#15803D";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default"
      style={{
        backgroundColor: `${hexColor}15`,
        color: hexColor,
        border: `1px solid ${hexColor}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: hexColor }}
      />
      {label}
    </span>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";

interface RiskBadgeProps {
  status: "FAIL" | "WARN" | "PASS";
  label: string;
  detail?: string;
  size?: "sm" | "md" | "lg";
}

const STATUS_CONFIG = {
  FAIL: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
    glow: "shadow-red-500/10",
  },
  WARN: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/10",
  },
  PASS: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/10",
  },
};

const SIZE_CONFIG = {
  sm: "px-2 py-0.5 text-xs gap-1.5",
  md: "px-3 py-1 text-sm gap-2",
  lg: "px-4 py-1.5 text-base gap-2",
};

export default function RiskBadge({ status, label, detail, size = "md" }: RiskBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClass = SIZE_CONFIG[size];

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center rounded-full font-medium border
        ${config.bg} ${config.border} ${config.text} ${config.glow} ${sizeClass}
        shadow-lg
      `}
      title={detail}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {label}
    </motion.span>
  );
}

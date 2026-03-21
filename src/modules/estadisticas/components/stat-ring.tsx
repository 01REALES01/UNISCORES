"use client";

import { useEffect, useRef } from "react";
import { useInView, motion, useSpring, useMotionValue } from "framer-motion";

interface StatRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StatRing({
  value,
  size = 80,
  strokeWidth = 6,
  color = "#818cf8",
  trackColor = "rgba(255,255,255,0.05)",
  className = "",
  children,
}: StatRingProps) {
  const ref = useRef<SVGCircleElement>(null);
  const isInView = useInView(ref as any, { once: true, margin: "-30px" });

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 60 });

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsub = springValue.on("change", (v) => {
      if (ref.current) {
        const offset = circumference - (v / 100) * circumference;
        ref.current.style.strokeDashoffset = String(offset);
      }
    });
    return unsub;
  }, [springValue, circumference]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="transition-none"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

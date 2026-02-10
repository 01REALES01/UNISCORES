"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

// ===== TYPES =====
type BarDataItem = {
    label: string;
    value: number;
    color?: string;
    icon?: string;
};

type DonutDataItem = {
    label: string;
    value: number;
    color: string;
    icon?: string;
};

type LineDataPoint = {
    label: string;
    value: number;
};

// ===== COLOR PALETTE =====
const CHART_COLORS = [
    "#818cf8", // indigo
    "#a78bfa", // violet
    "#f472b6", // pink
    "#34d399", // emerald
    "#fbbf24", // amber
    "#60a5fa", // blue
    "#fb923c", // orange
    "#2dd4bf", // teal
    "#e879f9", // fuchsia
    "#4ade80", // green
];

// ===== BAR CHART =====
export function BarChart({
    data,
    height = 280,
    className,
    showValues = true,
    animated = true,
}: {
    data: BarDataItem[];
    height?: number;
    className?: string;
    showValues?: boolean;
    animated?: boolean;
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const barWidth = Math.min(48, (100 / data.length) * 0.6);
    const gap = (100 - barWidth * data.length) / (data.length + 1);

    return (
        <div className={cn("w-full", className)} data-testid="bar-chart">
            <svg
                viewBox={`0 0 100 ${height / 4}`}
                className="w-full overflow-visible"
                preserveAspectRatio="none"
            >
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => (
                    <line
                        key={ratio}
                        x1="0"
                        y1={height / 4 - (height / 4 - 16) * ratio}
                        x2="100"
                        y2={height / 4 - (height / 4 - 16) * ratio}
                        stroke="currentColor"
                        className="text-border/20"
                        strokeWidth="0.15"
                        strokeDasharray="1,1"
                    />
                ))}

                {/* Bars */}
                {data.map((item, i) => {
                    const barH =
                        ((item.value / maxValue) * (height / 4 - 16));
                    const x = gap + i * (barWidth + gap);
                    const y = height / 4 - barH;
                    const color = item.color || CHART_COLORS[i % CHART_COLORS.length];
                    const isHovered = hoveredIndex === i;

                    return (
                        <g
                            key={i}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer"
                        >
                            {/* Bar shadow/glow */}
                            {isHovered && (
                                <rect
                                    x={x - 0.5}
                                    y={y - 1}
                                    width={barWidth + 1}
                                    height={barH + 1}
                                    rx="1.5"
                                    fill={color}
                                    opacity="0.2"
                                    filter="blur(2px)"
                                />
                            )}
                            {/* Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barH}
                                rx="1"
                                fill={color}
                                opacity={isHovered ? 1 : 0.85}
                                className={animated ? "transition-all duration-500 ease-out" : ""}
                            >
                                {animated && (
                                    <animate
                                        attributeName="height"
                                        from="0"
                                        to={barH}
                                        dur="0.8s"
                                        fill="freeze"
                                    />
                                )}
                            </rect>
                            {/* Value label */}
                            {showValues && (
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 2}
                                    textAnchor="middle"
                                    className="fill-foreground text-[2.5px] font-bold"
                                    opacity={isHovered ? 1 : 0.7}
                                >
                                    {item.value}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {/* Labels */}
            <div
                className="flex justify-around mt-2 px-1"
                style={{ gap: `${gap * 0.5}%` }}
            >
                {data.map((item, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex flex-col items-center transition-all duration-200",
                            hoveredIndex === i ? "opacity-100 scale-105" : "opacity-60"
                        )}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {item.icon && <span className="text-lg mb-0.5">{item.icon}</span>}
                        <span className="text-[10px] font-semibold text-center leading-tight truncate max-w-[60px]">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===== DONUT CHART =====
export function DonutChart({
    data,
    size = 200,
    thickness = 28,
    className,
    centerLabel,
    centerValue,
}: {
    data: DonutDataItem[];
    size?: number;
    thickness?: number;
    className?: string;
    centerLabel?: string;
    centerValue?: string | number;
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const center = size / 2;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulated = 0;

    return (
        <div className={cn("flex flex-col items-center", className)} data-testid="donut-chart">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Background arc */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        className="text-border/10"
                        strokeWidth={thickness}
                    />
                    {/* Data arcs */}
                    {data.map((item, i) => {
                        const percentage = total > 0 ? item.value / total : 0;
                        const dashLength = circumference * percentage;
                        const dashOffset = circumference * (1 - accumulated);
                        accumulated += percentage;
                        const isHovered = hoveredIndex === i;

                        return (
                            <circle
                                key={i}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={isHovered ? thickness + 6 : thickness}
                                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                                strokeDashoffset={-dashOffset + circumference}
                                strokeLinecap="round"
                                className="transition-all duration-300 cursor-pointer"
                                opacity={hoveredIndex !== null && !isHovered ? 0.4 : 1}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{
                                    filter: isHovered ? `drop-shadow(0 0 8px ${item.color}66)` : "none",
                                }}
                            >
                                <animate
                                    attributeName="stroke-dashoffset"
                                    from={circumference}
                                    to={-dashOffset + circumference}
                                    dur="1s"
                                    fill="freeze"
                                />
                            </circle>
                        );
                    })}
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {hoveredIndex !== null ? (
                        <>
                            <span className="text-2xl font-black">{data[hoveredIndex].value}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {data[hoveredIndex].label}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-3xl font-black">{centerValue ?? total}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {centerLabel ?? "Total"}
                            </span>
                        </>
                    )}
                </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {data.map((item, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all",
                            hoveredIndex === i
                                ? "bg-muted/40 scale-105"
                                : "hover:bg-muted/20"
                        )}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] font-medium">
                            {item.icon && <span className="mr-0.5">{item.icon}</span>}
                            {item.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold">
                            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===== MINI LINE CHART =====
export function MiniLineChart({
    data,
    height = 60,
    color = "#818cf8",
    className,
    showDots = true,
}: {
    data: LineDataPoint[];
    height?: number;
    color?: string;
    className?: string;
    showDots?: boolean;
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    if (data.length < 2) return null;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const minValue = Math.min(...data.map((d) => d.value), 0);
    const range = maxValue - minValue || 1;
    const width = 100;
    const padding = 4;

    const points = data.map((d, i) => ({
        x: padding + (i / (data.length - 1)) * (width - 2 * padding),
        y: padding + (1 - (d.value - minValue) / range) * (height - 2 * padding),
    }));

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return (
        <div className={cn("w-full", className)} data-testid="mini-line-chart">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
                {/* Gradient fill */}
                <defs>
                    <linearGradient id={`line-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Area */}
                <path
                    d={areaPath}
                    fill={`url(#line-gradient-${color.replace('#', '')})`}
                    className="transition-all duration-500"
                />
                {/* Line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                />
                {/* Dots */}
                {showDots &&
                    points.map((p, i) => (
                        <g key={i}>
                            {hoveredIndex === i && (
                                <circle cx={p.x} cy={p.y} r="4" fill={color} opacity="0.2" />
                            )}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredIndex === i ? "2.5" : "1.5"}
                                fill={color}
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        </g>
                    ))}
            </svg>
            {/* X labels */}
            <div className="flex justify-between mt-1 px-1">
                {data.map((d, i) => (
                    <span
                        key={i}
                        className={cn(
                            "text-[9px] font-medium transition-opacity",
                            hoveredIndex === i ? "text-foreground" : "text-muted-foreground/50"
                        )}
                    >
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ===== PROGRESS BAR =====
export function ProgressBar({
    value,
    max = 100,
    color = "#818cf8",
    label,
    showPercentage = true,
    size = "default",
    className,
}: {
    value: number;
    max?: number;
    color?: string;
    label?: string;
    showPercentage?: boolean;
    size?: "sm" | "default" | "lg";
    className?: string;
}) {
    const percentage = Math.min(Math.round((value / max) * 100), 100);
    const heights = { sm: "h-1.5", default: "h-2.5", lg: "h-4" };

    return (
        <div className={cn("w-full", className)} data-testid="progress-bar">
            {(label || showPercentage) && (
                <div className="flex justify-between items-center mb-1.5">
                    {label && (
                        <span className="text-xs font-semibold text-foreground/80">{label}</span>
                    )}
                    {showPercentage && (
                        <span className="text-[10px] font-bold text-muted-foreground">{percentage}%</span>
                    )}
                </div>
            )}
            <div className={cn("w-full rounded-full bg-muted/30 overflow-hidden", heights[size])}>
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        boxShadow: `0 0 12px ${color}44`,
                    }}
                />
            </div>
        </div>
    );
}

// ===== STAT CARD (for dashboard) =====
export function StatMiniCard({
    icon,
    label,
    value,
    change,
    changeType = "neutral",
    className,
}: {
    icon: string;
    label: string;
    value: string | number;
    change?: string;
    changeType?: "up" | "down" | "neutral";
    className?: string;
}) {
    const changeColors = {
        up: "text-emerald-400 bg-emerald-400/10",
        down: "text-red-400 bg-red-400/10",
        neutral: "text-muted-foreground bg-muted/30",
    };

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-4 rounded-2xl bg-card/50 border border-border/20 hover:border-border/40 transition-all group",
                className
            )}
        >
            <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-xl font-black">{value}</p>
            </div>
            {change && (
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", changeColors[changeType])}>
                    {change}
                </span>
            )}
        </div>
    );
}

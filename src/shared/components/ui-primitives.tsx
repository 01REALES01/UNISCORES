import { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ===== CARD =====
export function Card({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "text-card-foreground rounded-2xl bg-white/8 p-5 transition-all duration-300",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// ===== BADGE =====
export function Badge({
    children,
    variant = "default",
    className
}: {
    children: ReactNode;
    variant?: "default" | "outline" | "destructive" | "success" | "live" | "secondary";
    className?: string;
}) {
    const variants = {
        default: "bg-violet-500/15 text-violet-200",
        outline: "bg-white/5 text-slate-300",
        destructive: "bg-red-500/15 text-red-400",
        success: "bg-emerald-500/15 text-emerald-400",
        secondary: "bg-white/10 text-white",
        live: "bg-red-500/15 text-red-400 live-indicator",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}

// ===== BUTTON =====
export function Button({
    className,
    variant = "default",
    size = "default",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "link" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
}) {
    const variants = {
        default: "bg-violet-600 text-white hover:bg-violet-700",
        outline: "bg-white/5 hover:bg-white/10 text-white",
        ghost: "hover:bg-white/5 text-slate-400 hover:text-white",
        link: "text-violet-400 underline-offset-4 hover:underline",
        secondary: "bg-white/10 text-white hover:bg-white/15",
    };

    const sizes = {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3 py-1.5 text-sm",
        lg: "h-12 px-8 py-3 text-base",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl font-bold tracking-wide transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
                "active:scale-[0.98]",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}

// ===== INPUT =====
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "flex h-11 w-full rounded-xl bg-white/8 px-4 py-2.5 text-sm font-medium text-white",
                "placeholder:text-white/40",
                "focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-violet-400/30",
                "transition-all duration-200",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    );
}

// ===== AVATAR =====
export function Avatar({
    name,
    size = "default",
    src,
    className
}: {
    name?: string | null;
    size?: "sm" | "default" | "lg";
    src?: string | null;
    className?: string;
}) {
    const sizes = {
        sm: "w-8 h-8 text-xs",
        default: "w-12 h-12 text-sm",
        lg: "w-16 h-16 text-lg",
    };

    const safeName = name || "?";
    const initials = safeName.substring(0, 2).toUpperCase();

    // Generate consistent color based on name
    const colors = [
        "bg-violet-500",
        "bg-emerald-500",
        "bg-amber-500",
        "bg-cyan-500",
        "bg-rose-500",
    ];
    const colorIndex = safeName.charCodeAt(0) % colors.length;

    return (
        <div className={cn(
            "rounded-full flex items-center justify-center font-bold text-white overflow-hidden flex-shrink-0",
            !src && colors[colorIndex],
            sizes[size],
            className
        )}>
            {src ? (
                <Image
                    src={src}
                    alt={safeName}
                    width={size === "lg" ? 64 : size === "sm" ? 32 : 48}
                    height={size === "lg" ? 64 : size === "sm" ? 32 : 48}
                    className="w-full h-full object-cover"
                />
            ) : (
                initials
            )}
        </div>
    );
}

// ===== SCORE DISPLAY =====
export function ScoreDisplay({
    scoreA,
    scoreB,
    separator = ":",
    size = "default",
    className
}: {
    scoreA: number;
    scoreB: number;
    separator?: string;
    size?: "sm" | "default" | "lg";
    className?: string;
}) {
    const sizes = {
        sm: "text-xl",
        default: "text-3xl",
        lg: "text-5xl",
    };

    return (
        <div className={cn(
            "font-black font-mono tracking-tight flex items-center gap-2",
            sizes[size],
            className
        )}>
            <span className="text-white">{scoreA}</span>
            <span className="text-white/30">{separator}</span>
            <span className="text-white/70">{scoreB}</span>
        </div>
    );
}

// ===== LIVE INDICATOR =====
export function LiveIndicator({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">En Curso</span>
        </div>
    );
}

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ===== CARD =====
export function Card({
    children,
    className,
    variant = "default",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "gradient";
}) {
    const variants = {
        default: "bg-card border-border/50",
        glass: "glass",
        gradient: "gradient-border bg-card",
    };

    return (
        <div
            className={cn(
                "text-card-foreground rounded-[2rem] border shadow-lg shadow-black/5 p-5 transition-all duration-300",
                variants[variant],
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
        default: "bg-red-500/10 text-red-500 border-red-500/20",
        outline: "border-white/10 bg-white/5 text-slate-400",
        destructive: "bg-red-600/20 text-red-500 border-red-600/30",
        success: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
        secondary: "bg-white/10 text-white border-white/20",
        live: "bg-red-500/20 text-red-500 border-red-500/30 live-indicator shadow-[0_0_10px_rgba(239,68,68,0.2)]",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
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
    variant?: "default" | "outline" | "ghost" | "link" | "secondary" | "glass";
    size?: "default" | "sm" | "lg" | "icon";
}) {
    const variants = {
        default: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 border-none",
        outline: "border border-white/10 bg-white/5 hover:bg-white/10 text-white",
        ghost: "hover:bg-white/5 text-slate-400 hover:text-white",
        link: "text-red-500 underline-offset-4 hover:underline",
        secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10",
        glass: "bg-white/5 backdrop-blur-md hover:bg-white/10 text-white border border-white/10",
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
                "inline-flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-widest transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
                "flex h-11 w-full rounded-xl border-2 border-border/60 bg-muted/30 px-4 py-2.5 text-sm font-medium",
                "placeholder:text-muted-foreground/60",
                "focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20",
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
    className
}: {
    name?: string | null;
    size?: "sm" | "default" | "lg";
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
        "from-blue-500 to-indigo-600",
        "from-purple-500 to-pink-600",
        "from-orange-500 to-red-600",
        "from-green-500 to-teal-600",
        "from-cyan-500 to-blue-600",
    ];
    const colorIndex = safeName.charCodeAt(0) % colors.length;

    return (
        <div className={cn(
            "rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white shadow-lg",
            colors[colorIndex],
            sizes[size],
            className
        )}>
            {initials}
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
            <span className="text-foreground">{scoreA}</span>
            <span className="text-muted-foreground/40">{separator}</span>
            <span className="text-foreground/70">{scoreB}</span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">En Vivo</span>
        </div>
    );
}

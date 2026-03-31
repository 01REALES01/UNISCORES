"use client";

import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";

export function NoticiasShell({ children }: { children: React.ReactNode }) {
    const { user, profile, isStaff } = useAuth();

    return (
        <div className="min-h-screen bg-background text-white selection:bg-indigo-500/30 font-sans">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />
            <main className="max-w-5xl mx-auto px-4 pt-10 pb-12 relative z-10">
                {children}
            </main>
        </div>
    );
}

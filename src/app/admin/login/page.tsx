"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UniqueLoading from "@/components/ui/morph-loading";

// Admin login now redirects to the unified login page
export default function AdminLoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/login");
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white/8 gap-8">
            <UniqueLoading size="lg" />
            <div className="text-center">
                <p className="text-[#FFC000] font-black uppercase tracking-[0.3em] animate-pulse text-sm">Redirigiendo</p>
            </div>
        </div>
    );
}

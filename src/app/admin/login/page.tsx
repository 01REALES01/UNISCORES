"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Admin login now redirects to the unified login page
export default function AdminLoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/login");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#17130D]">
            <Loader2 size={32} className="animate-spin text-[#FFC000]" />
        </div>
    );
}

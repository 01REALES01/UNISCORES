"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";

import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider />
            {children}
        </AuthProvider>
    );
}

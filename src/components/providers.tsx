"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider />
            <LazyMotion features={domAnimation}>
                {children}
            </LazyMotion>
        </AuthProvider>
    );
}

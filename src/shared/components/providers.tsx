"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

import { ToastProvider } from "@/components/toast-provider";
import { WelcomeNotice } from "@/components/welcome-notice";
import { ServiceWorkerRegister } from "@/shared/components/sw-register";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider />
            <WelcomeNotice />
            <ServiceWorkerRegister />
            <LazyMotion features={domAnimation}>
                {children}
            </LazyMotion>
        </AuthProvider>
    );
}

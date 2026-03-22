"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

import { ToastProvider } from "@/components/toast-provider";
import { WelcomeNotice } from "@/components/welcome-notice";
import { ServiceWorkerRegister } from "@/shared/components/sw-register";
import { VisibilityRevalidate } from "@/shared/components/visibility-revalidate";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider />
            <WelcomeNotice />
            <ServiceWorkerRegister />
            <VisibilityRevalidate />
            <LazyMotion features={domAnimation}>
                {children}
            </LazyMotion>
        </AuthProvider>
    );
}

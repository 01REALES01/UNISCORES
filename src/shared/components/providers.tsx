"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { SWRConfig } from "swr";

import { ToastProvider } from "@/components/toast-provider";
import { WelcomeNotice } from "@/components/welcome-notice";
import { ServiceWorkerRegister } from "@/shared/components/sw-register";
import { VisibilityRevalidate } from "@/shared/components/visibility-revalidate";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <SWRConfig value={{
                revalidateOnFocus: true,
                focusThrottleInterval: 5000,
                revalidateOnReconnect: true,
                errorRetryCount: 3,
            }}>
                <ToastProvider />
                <WelcomeNotice />
                <ServiceWorkerRegister />
                <VisibilityRevalidate />
                <LazyMotion features={domAnimation}>
                    {children}
                </LazyMotion>
            </SWRConfig>
        </AuthProvider>
    );
}

"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { SWRConfig } from "swr";

import { ToastProvider } from "@/components/toast-provider";
import { WelcomeNotice } from "@/components/welcome-notice";
import { VisibilityRevalidate } from "@/shared/components/visibility-revalidate";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <SWRConfig value={{
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                errorRetryCount: 3,
                keepPreviousData: true,
            }}>
                <ToastProvider />
                <WelcomeNotice />
                <VisibilityRevalidate />
                <LazyMotion features={domAnimation}>
                    {children}
                </LazyMotion>
            </SWRConfig>
        </AuthProvider>
    );
}

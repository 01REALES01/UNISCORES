"use client";

import { ResilienceUI } from "@/components/resilience-ui";

export default function MatchError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    console.error("[partido/error.tsx] Caught error:", error);

    return (
        <ResilienceUI 
            title="Error al Cargar"
            description={error.message || "Hubo un problema al recuperar los datos del encuentro."}
            onRetry={reset}
            backFallback="/partidos"
            retryLabel="REINTENTAR ACCIÓN"
        />
    );
}

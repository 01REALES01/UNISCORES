"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

function TvFallback() {
    return (
        <div className="min-h-svh flex items-center justify-center bg-background text-foreground text-2xl font-black tracking-wide">
            Cargando vista TV…
        </div>
    );
}

const TvResultadosScreen = dynamic(
    () => import("./tv-resultados-screen").then((m) => m.TvResultadosScreen),
    { ssr: false, loading: () => <TvFallback /> }
);

export function TvResultadosClient() {
    return (
        <Suspense fallback={<TvFallback />}>
            <TvResultadosScreen />
        </Suspense>
    );
}

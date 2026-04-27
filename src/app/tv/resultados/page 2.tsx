import { Suspense } from "react";
import { TvResultadosScreen } from "./tv-resultados-screen";

function TvFallback() {
    return (
        <div className="min-h-svh flex items-center justify-center bg-[#4C1D95] text-[#F5F5DC] text-2xl font-black tracking-wide">
            Cargando vista TV…
        </div>
    );
}

export default function TvResultadosPage() {
    return (
        <Suspense fallback={<TvFallback />}>
            <TvResultadosScreen />
        </Suspense>
    );
}

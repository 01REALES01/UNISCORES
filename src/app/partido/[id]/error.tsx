"use client";

import Link from "next/link";

export default function MatchError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    console.error("[partido/error.tsx] Caught error:", error);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">⚠️ Error cargando el partido</h1>
            <p className="text-slate-400 mb-6 max-w-md">{error.message}</p>
            <div className="flex gap-4">
                <button
                    onClick={reset}
                    className="px-6 py-2 rounded-full bg-red-500 text-white font-bold hover:bg-red-600 transition"
                >
                    Reintentar
                </button>
                <Link
                    href="/"
                    className="px-6 py-2 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition"
                >
                    Volver al inicio
                </Link>
            </div>
        </div>
    );
}

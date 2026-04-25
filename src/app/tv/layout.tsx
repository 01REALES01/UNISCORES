import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "TV — Resultados | Olimpiadas UNINORTE",
    description: "Vista para pantallas: resultados del día, legible a distancia.",
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="tv-route-root min-h-svh bg-[#4C1D95] text-[#F5F5DC] antialiased">{children}</div>
    );
}

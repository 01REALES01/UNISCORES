import { MedalLeaderboard } from "@/components/medalleria-board";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui-primitives";

export const metadata = {
    title: 'Medallería General | Olimpiadas 2026',
    description: 'Ranking de facultades y medallería olímpica actualizada en tiempo real.',
};

export default function MedalleroPage() {
    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30">

            {/* Header Simple */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0805]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-black tracking-tight">Volver al Inicio</h1>
                    </div>
                    <div className="text-xs font-mono font-black tracking-widest text-white/40 hidden sm:block">
                        RANKING OFICIAL
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <MedalLeaderboard />
                </div>

                <div className="mt-12 text-center">
                    <p className="text-white/40 font-bold tracking-wide text-sm max-w-lg mx-auto">
                        El ranking se calcula automáticamente: Oro (5pts), Plata (3pts), Bronce (1pt).
                        Los resultados se actualizan al finalizar cada evento.
                    </p>
                </div>
            </main>
        </div>
    );
}

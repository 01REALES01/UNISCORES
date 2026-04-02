"use client";

import { motion } from "framer-motion";
import { Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";

export interface CardedPlayer {
  jugador_id: number;
  nombre: string;
  profile_id: string | null;
  deporte: string;
  count: number;
}

interface DisciplineTrackerProps {
  yellowLeaders: CardedPlayer[];
  redLeaders: CardedPlayer[];
}

function CardList({
  players,
  type,
}: {
  players: CardedPlayer[];
  type: "yellow" | "red";
}) {
  const isYellow = type === "yellow";
  const borderColor = isYellow ? "border-t-amber-500" : "border-t-rose-500";
  const badgeClass = isYellow
    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
    : "bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]";
  const dotColor = isYellow ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]";
  const title = isYellow ? "Tarjetas Amarillas" : "Tarjetas Rojas";

  return (
    <div className={cn("rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-md overflow-hidden border-t-[3px] shadow-2xl relative", borderColor)}>
      <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[50px] opacity-10 pointer-events-none", isYellow ? "bg-amber-500 opacity-[0.15]" : "bg-rose-500 opacity-[0.15]")} />
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 relative z-10">
        <div className={cn("w-3 h-4 rounded-sm", dotColor)} />
        <span className="text-xs font-black font-display tracking-widest text-white/50 uppercase">{title}</span>
      </div>

      {players.length === 0 ? (
        <div className="px-4 pb-4 text-center">
          <p className="text-[11px] text-white/20 font-medium py-6">Sin tarjetas registradas</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {players.map((player, idx) => (
            <motion.div
              key={`${type}-${player.jugador_id}`}
              initial={{ opacity: 0, x: isYellow ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-xs sm:text-sm font-black font-display text-white/20 tabular-nums w-5 drop-shadow-sm">{idx + 1}</span>
              <Avatar name={player.nombre} className="w-8 h-8 sm:w-10 sm:h-10 text-xs border border-white/10" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white/90 truncate font-display">{player.nombre}</p>
                <p className="text-[10px] sm:text-[11px] text-white/40 font-display tracking-wide mt-0.5">{player.deporte}</p>
              </div>
              <div className={cn("px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black tabular-nums font-mono drop-shadow-md", badgeClass)}>
                {player.count}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DisciplineTracker({ yellowLeaders, redLeaders }: DisciplineTrackerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <CardList players={yellowLeaders} type="yellow" />
      <CardList players={redLeaders} type="red" />
    </div>
  );
}

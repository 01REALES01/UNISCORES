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
  const borderColor = isYellow ? "border-t-amber-500" : "border-t-red-500";
  const badgeClass = isYellow
    ? "bg-amber-500/15 text-amber-400"
    : "bg-red-500/15 text-red-400";
  const dotColor = isYellow ? "bg-amber-500" : "bg-red-500";
  const title = isYellow ? "AMARILLAS" : "ROJAS";

  return (
    <div className={cn("rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden border-t-2", borderColor)}>
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className={cn("w-3 h-4 rounded-sm", dotColor)} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{title}</span>
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
              <span className="text-xs font-black text-white/15 tabular-nums w-4">{idx + 1}</span>
              <Avatar name={player.nombre} className="w-7 h-7 text-[10px]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/80 truncate">{player.nombre}</p>
                <p className="text-[9px] text-white/25 font-medium">{player.deporte}</p>
              </div>
              <div className={cn("px-2.5 py-1 rounded-lg text-xs font-black tabular-nums", badgeClass)}>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <CardList players={yellowLeaders} type="yellow" />
      <CardList players={redLeaders} type="red" />
    </div>
  );
}

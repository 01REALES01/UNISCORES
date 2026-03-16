import { ScoreDetail, ScoreResult } from "@/lib/sport-scoring";

export interface ISportService {
    getPeriodDuration(): number;
    isCountdown(): boolean;
    getCurrentPeriodNumber(detalle: ScoreDetail): number;
    getCurrentScore(detalle: ScoreDetail): ScoreResult;
    isFinished(detalle: ScoreDetail): boolean;
    
    // Core state mutations
    addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos?: number): ScoreDetail;
    removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos?: number): ScoreDetail;
    setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail;
    recalculateTotals(detalle: ScoreDetail): ScoreDetail;
}

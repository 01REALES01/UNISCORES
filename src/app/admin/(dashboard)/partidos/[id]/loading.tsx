import { Skeleton } from "@/components/skeletons";
import { Card } from "@/components/ui-primitives";

export default function MatchControlLoading() {
    return (
        <div className="min-h-screen bg-[#070504] pb-24 text-white">
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-40" />
                
                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-16">
                    {/* Top Nav Skeleton */}
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-24 rounded-xl" />
                            <Skeleton className="h-6 w-32 rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>

                    {/* Operational Info Skeleton */}
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                        <Skeleton className="h-10 w-32 rounded-2xl" />
                    </div>

                    {/* SCOREBOARD SKELETON */}
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-12">
                            {/* Team A */}
                            <div className="flex flex-col items-center gap-6">
                                <Skeleton className="w-36 h-36 rounded-[2.5rem]" />
                                <Skeleton className="h-8 w-48" />
                            </div>

                            {/* Center Score */}
                            <div className="flex flex-col items-center gap-8 min-w-[300px]">
                                <Skeleton className="h-40 w-80 rounded-[3.5rem]" />
                                <div className="space-y-4 w-full flex flex-col items-center">
                                    <Skeleton className="h-12 w-48 rounded-2xl" />
                                    <div className="flex gap-4 w-full">
                                        <Skeleton className="h-14 flex-1 rounded-2xl" />
                                        <Skeleton className="h-14 w-14 rounded-2xl" />
                                    </div>
                                </div>
                            </div>

                            {/* Team B */}
                            <div className="flex flex-col items-center gap-6">
                                <Skeleton className="w-36 h-36 rounded-[2.5rem]" />
                                <Skeleton className="h-8 w-48" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.5fr_1fr] gap-8">
                    {/* LEFT CONTROLLER SKELETON */}
                    <Card variant="glass" className="p-0 border-white/10 bg-zinc-900/50 overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                        <div className="p-6 space-y-8">
                            <div className="space-y-3">
                                <Skeleton className="h-3 w-32" />
                                <div className="grid grid-cols-4 gap-3">
                                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Skeleton className="h-3 w-32" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-16 rounded-2xl" />
                                    <Skeleton className="h-16 rounded-2xl" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* RIGHT TIMELINE SKELETON */}
                    <Card variant="glass" className="h-[600px] flex flex-col p-0 border-white/5 overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-5 w-10" />
                        </div>
                        <div className="flex-1 p-4 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 p-3 rounded-2xl bg-white/5">
                                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

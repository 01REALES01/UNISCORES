import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-white/5", className)}
            {...props}
        />
    );
}

export function MatchCardSkeleton() {
    return (
        <div className="bg-[#0a0f1c] border border-white/5 rounded-3xl p-6 h-[180px] flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-16" />
            </div>

            <div className="flex justify-between items-center px-4">
                <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                </div>

                <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-10" />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                </div>
            </div>

            <div className="border-t border-white/5 pt-3 mt-2 flex justify-between items-center">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
    )
}

export function MedalSkeleton() {
    return (
        <div className="w-full h-96 bg-[#0a0f1c]/40 border border-white/5 rounded-[3rem] p-8 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-12">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            <div className="flex justify-center items-end gap-4 mb-12 h-64">
                <Skeleton className="w-1/3 h-48 rounded-t-3xl" />
                <Skeleton className="w-1/3 h-64 rounded-t-3xl bg-white/10" />
                <Skeleton className="w-1/3 h-32 rounded-t-3xl" />
            </div>
        </div>
    )
}

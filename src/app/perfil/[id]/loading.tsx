import { Skeleton } from "@/components/skeletons";
import { Card } from "@/components/ui-primitives";

export default function PublicProfileLoading() {
    return (
        <div className="min-h-screen bg-background text-white overflow-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-20 pb-20 relative z-10">
                <div className="mb-8">
                    <Skeleton className="h-4 w-24 rounded-full" />
                </div>

                {/* Header Profile Section Skeleton */}
                <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
                    <Skeleton className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem]" />
                    
                    <div className="flex-1 space-y-6">
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-3/4 md:w-1/2 rounded-2xl" />
                            <Skeleton className="h-6 w-32 rounded-full" />
                        </div>
                        
                        <Skeleton className="h-8 w-full max-w-lg rounded-xl" />
                        
                        <div className="flex gap-4">
                            <Skeleton className="h-16 w-32 rounded-2xl" />
                            <Skeleton className="h-16 w-48 rounded-2xl" />
                        </div>
                    </div>
                </div>

                {/* Content Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="md:col-span-1 p-8 space-y-6">
                        <Skeleton className="h-4 w-40 mb-8" />
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-20 rounded-2xl" />
                                <Skeleton className="h-20 rounded-2xl" />
                            </div>
                            <Skeleton className="h-24 w-full rounded-2xl" />
                        </div>
                    </Card>

                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 h-[200px]">
                            <Skeleton className="h-4 w-40 mb-6" />
                            <div className="space-y-3">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
                                <Skeleton className="h-3 w-4/6" />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8">
                            <div className="flex justify-between mb-8">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

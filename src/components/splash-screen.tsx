"use client";

import { useState, useEffect } from "react";

const SPLASH_KEY = "uninorte_splash_seen";

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
    const [isVisible, setIsVisible] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const totalFrames = 80;
    // ~24fps = ~41ms per frame. We'll use 40ms to make it smooth.
    const frameIntervalMs = 40;

    useEffect(() => {
        setIsClient(true);

        // Check if user has already seen splash screen this session
        try {
            if (sessionStorage.getItem(SPLASH_KEY) === "true") {
                setIsVisible(false);
                onComplete?.();
                return;
            }
        } catch { }

        // Start animation loop
        let frame = 0;
        const interval = setInterval(() => {
            frame++;
            if (frame >= totalFrames) {
                clearInterval(interval);

                // Start fade out
                setIsFadingOut(true);

                // Mark as seen for this session
                try {
                    sessionStorage.setItem(SPLASH_KEY, "true");
                } catch { }

                // Wait for fade out transition (700ms) to unmount
                setTimeout(() => {
                    setIsVisible(false);
                    onComplete?.();
                }, 700);
            } else {
                setCurrentFrame(frame);
            }
        }, frameIntervalMs);

        return () => clearInterval(interval);
    }, [onComplete]);

    // Don't render until client-side hydration is complete to prevent flashing
    if (!isClient || !isVisible) return null;

    // Helper to format frame number with leading zeros (000 to 079)
    const getFramePath = (index: number) => {
        const paddedIndex = index.toString().padStart(3, '0');
        return `/animacion_UNISCORES/The_general_idea_1080p_202602250113_${paddedIndex}.jpg`;
    };

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-700 ease-in-out ${isFadingOut ? "opacity-0" : "opacity-100"
                }`}
        >
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                {/* 
                    We render the current frame.
                */}
                <img
                    src={getFramePath(currentFrame)}
                    alt="Cargando Olimpiadas 2026"
                    // On mobile: fills height, crops sides cleanly (object-cover).
                    // On desktop: contained to show full ratio, scaled slightly to enhance presence.
                    className="w-full h-full object-cover md:object-contain md:scale-[1.15]"
                    draggable={false}
                />

                {/* Preloading next few frames to ensure smooth playback without network stutter */}
                <div className="hidden">
                    {[1, 2, 3, 4, 5].map(offset => {
                        const nextIndex = currentFrame + offset;
                        if (nextIndex < totalFrames) {
                            return (
                                <img
                                    key={nextIndex}
                                    src={getFramePath(nextIndex)}
                                    alt=""
                                    aria-hidden="true"
                                />
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* Skip button for impatient users */}
            <button
                onClick={() => {
                    setIsFadingOut(true);
                    try { sessionStorage.setItem(SPLASH_KEY, "true"); } catch { }
                    setTimeout(() => {
                        setIsVisible(false);
                        onComplete?.();
                    }, 400); // Faster fade out on skip
                }}
                className={`absolute bottom-6 right-6 text-white/30 hover:text-white/80 text-[10px] 
                    font-medium tracking-wider uppercase transition-all duration-300 
                    px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 
                    backdrop-blur-sm z-10 ${isFadingOut ? "opacity-0" : "opacity-100"}`}
            >
                Saltar
            </button>
        </div>
    );
}

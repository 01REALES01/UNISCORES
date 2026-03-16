"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SPLASH_KEY = "uninorte_splash_seen";
const TOTAL_FRAMES = 80;
const FRAME_INTERVAL_MS = 40; // ~25fps

function getFramePath(index: number) {
    return `/animacion_UNISCORES/The_general_idea_1080p_202602250113_${index.toString().padStart(3, '0')}.jpg`;
}

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const frameRef = useRef(0);
    const animIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef(0);

    // Check session + preload all images
    useEffect(() => {
        setIsClient(true);

        try {
            if (sessionStorage.getItem(SPLASH_KEY) === "true") {
                setIsVisible(false);
                onComplete?.();
                return;
            }
        } catch { }

        // Preload all frames into Image objects
        let loaded = 0;
        const images: HTMLImageElement[] = [];

        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();
            img.src = getFramePath(i);
            img.onload = () => {
                loaded++;
                if (loaded >= TOTAL_FRAMES) {
                    setIsReady(true);
                }
            };
            img.onerror = () => {
                loaded++;
                if (loaded >= TOTAL_FRAMES) {
                    setIsReady(true);
                }
            };
            images.push(img);
        }
        imagesRef.current = images;

        return () => {
            if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
        };
    }, [onComplete]);

    // Start canvas animation once images are ready
    const startAnimation = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const images = imagesRef.current;
        if (images.length === 0) return;

        // Set canvas size to match first image
        const firstImg = images[0];
        canvas.width = firstImg.naturalWidth;
        canvas.height = firstImg.naturalHeight;

        frameRef.current = 0;
        lastTimeRef.current = performance.now();

        const animate = (now: number) => {
            const elapsed = now - lastTimeRef.current;

            if (elapsed >= FRAME_INTERVAL_MS) {
                lastTimeRef.current = now - (elapsed % FRAME_INTERVAL_MS);
                const frame = frameRef.current;

                if (frame >= TOTAL_FRAMES) {
                    // Animation complete
                    setIsFadingOut(true);
                    try { sessionStorage.setItem(SPLASH_KEY, "true"); } catch { }
                    setTimeout(() => {
                        setIsVisible(false);
                        onComplete?.();
                    }, 700);
                    return;
                }

                // Draw current frame
                const img = images[frame];
                if (img.complete && img.naturalWidth > 0) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }

                frameRef.current = frame + 1;
            }

            animIdRef.current = requestAnimationFrame(animate);
        };

        animIdRef.current = requestAnimationFrame(animate);
    }, [onComplete]);

    useEffect(() => {
        if (isReady) {
            startAnimation();
        }
    }, [isReady, startAnimation]);

    if (!isClient || !isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-700 ease-in-out ${isFadingOut ? "opacity-0" : "opacity-100"
                }`}
        >
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover md:object-contain md:scale-[1.15]"
                />
            </div>

            {/* Skip button */}
            <button
                onClick={() => {
                    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
                    setIsFadingOut(true);
                    try { sessionStorage.setItem(SPLASH_KEY, "true"); } catch { }
                    setTimeout(() => {
                        setIsVisible(false);
                        onComplete?.();
                    }, 400);
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

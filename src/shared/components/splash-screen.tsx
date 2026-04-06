"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SPLASH_KEY = "uninorte_splash_seen";
const TOTAL_FRAMES = 179;
const FRAME_INTERVAL_MS = 22; // ~45fps to reach ~4s duration with 179 frames

function getFramePath(index: number) {
    return `/animacion_UNISCORES/ezgif-frame-${(index + 1).toString().padStart(3, '0')}.jpg`;
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

    // Dynamic config based on device
    const [config, setConfig] = useState({
        folder: "/animacion_UNISCORES/",
        total: 179,
        interval: 22,
        startFrame: 0,
        isMobile: false
    });

    useEffect(() => {
        setIsClient(true);

        const isMobileDevice = window.innerWidth < 768;
        const currentConfig = isMobileDevice ? {
            folder: "/animacion_movil/",
            total: 200,
            interval: 22,
            startFrame: 20, // Skip first 20 frames as requested
            isMobile: true
        } : {
            folder: "/animacion_UNISCORES/",
            total: 179,
            interval: 22,
            startFrame: 0,
            isMobile: false
        };
        
        setConfig(currentConfig);

        try {
            if (sessionStorage.getItem(SPLASH_KEY) === "true") {
                setIsVisible(false);
                onComplete?.();
                return;
            }
        } catch { }

        // Preload frames
        let loaded = 0;
        const images: HTMLImageElement[] = [];

        for (let i = 0; i < currentConfig.total; i++) {
            const img = new Image();
            img.src = `${currentConfig.folder}ezgif-frame-${(i + 1).toString().padStart(3, '0')}.jpg`;
            img.onload = () => {
                loaded++;
                if (loaded >= currentConfig.total) setIsReady(true);
            };
            img.onerror = () => {
                loaded++;
                if (loaded >= currentConfig.total) setIsReady(true);
            };
            images.push(img);
        }
        imagesRef.current = images;

        return () => {
            if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
        };
    }, [onComplete]);

    const startAnimation = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const images = imagesRef.current;
        if (images.length === 0) return;

        const firstImg = images[0];
        canvas.width = firstImg.naturalWidth;
        canvas.height = firstImg.naturalHeight;

        frameRef.current = config.startFrame;
        lastTimeRef.current = performance.now();

        const animate = (now: number) => {
            const elapsed = now - lastTimeRef.current;

            if (elapsed >= config.interval) {
                lastTimeRef.current = now - (elapsed % config.interval);
                const frame = frameRef.current;

                if (frame >= config.total) {
                    setIsFadingOut(true);
                    try { sessionStorage.setItem(SPLASH_KEY, "true"); } catch { }
                    setTimeout(() => {
                        setIsVisible(false);
                        onComplete?.();
                    }, 700);
                    return;
                }

                const img = images[frame];
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }

                frameRef.current = frame + 1;
            }

            animIdRef.current = requestAnimationFrame(animate);
        };

        animIdRef.current = requestAnimationFrame(animate);
    }, [onComplete, config]);

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
                    className={`w-full h-full ${config.isMobile ? 'object-cover' : 'object-contain scale-[1.15]'}`}
                />
            </div>

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

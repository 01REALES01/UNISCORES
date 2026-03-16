"use client";

import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

interface FormFieldProps {
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ReactNode;
    showToggle?: boolean;
    onToggle?: () => void;
    showPassword?: boolean;
    required?: boolean;
    disabled?: boolean;
}

export const AnimatedFormField: React.FC<FormFieldProps> = ({
    type,
    placeholder,
    value,
    onChange,
    icon,
    showToggle,
    onToggle,
    showPassword,
    required,
    disabled
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    return (
        <div className="relative group">
            <div
                className="relative overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-md transition-all duration-300 ease-in-out shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-white/10 focus-within:border-[#FFC000] focus-within:bg-white/10"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors duration-200 group-focus-within:text-[#FFC000]">
                    {icon}
                </div>

                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full bg-transparent pl-11 pr-12 py-4 border-none text-white placeholder:text-transparent focus:outline-none disabled:opacity-50 font-medium"
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                />

                <label className={`absolute left-11 transition-all duration-200 ease-in-out pointer-events-none ${isFocused || value
                    ? 'top-2 text-[10px] text-[#FFC000] font-bold uppercase tracking-widest'
                    : 'top-1/2 -translate-y-1/2 text-sm font-medium text-white/40'
                    }`}>
                    {placeholder}
                </label>

                {showToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors bg-white/5 p-1 rounded-md backdrop-blur-md"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}

                {isHovering && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(150px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 192, 0, 0.08) 0%, transparent 70%)`
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export const SocialButton: React.FC<{ icon: React.ReactNode; name: string, onClick?: () => void, disabled?: boolean }> = ({ icon, name, onClick, disabled }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full relative group p-3.5 rounded-xl border border-white/20 bg-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-white/10 hover:border-[#FFC000]/50 transition-all duration-300 ease-in-out overflow-hidden flex items-center justify-center gap-3 disabled:opacity-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`absolute inset-0 bg-gradient-to-r from-[#DB1406]/5 via-[#FFC000]/10 to-[#DB1406]/5 transition-transform duration-500 ${isHovered ? 'translate-x-0' : '-translate-x-full'
                }`} />
            <div className="relative text-white/70 group-hover:text-white transition-colors font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                {icon}
                {name}
            </div>
        </button>
    );
};

export const FloatingParticles: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            colorIndex: number; // 0 for red, 1 for gold

            constructor() {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * window.innerHeight;
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.4;
                this.colorIndex = Math.random() > 0.5 ? 1 : 0;
            }

            update(width: number, height: number) {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > width) this.x = 0;
                if (this.x < 0) this.x = width;
                if (this.y > height) this.y = 0;
                if (this.y < 0) this.y = height;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.fillStyle = this.colorIndex === 1
                    ? `rgba(255, 192, 0, ${this.opacity})` // #FFC000
                    : `rgba(219, 20, 6, ${this.opacity})`; // #DB1406
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const particles: Particle[] = [];
        const particleCount = 60; // Slightly reduced for cleaner look

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update(canvas.width, canvas.height);
                particle.draw(ctx);
            });

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
};

export const ModernButton: React.FC<{ children: React.ReactNode, type?: "button" | "submit", disabled?: boolean, onClick?: () => void }> = ({ children, type = "button", disabled, onClick }) => {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className="w-full relative group bg-gradient-to-r from-[#DB1406] to-[#b51005] text-white py-4 px-4 rounded-xl font-black uppercase tracking-widest transition-all duration-300 ease-in-out shadow-[0_4px_15px_rgba(219,20,6,0.2)] hover:shadow-[0_8px_25px_rgba(219,20,6,0.4)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#DB1406] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        </button>
    );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, m } from "framer-motion";

interface Tab {
    title: string;
    icon: React.ElementType;
    type?: never;
}

interface Separator {
    type: "separator";
    title?: never;
    icon?: never;
}

export type TabItem = Tab | Separator;

interface ExpandableTabsProps {
    tabs: TabItem[];
    className?: string;
    activeColor?: string;
    activeItem?: number | null;
    onChange?: (index: number | null) => void;
    onHover?: (index: number) => void;
}

export function ExpandableTabs({
    tabs,
    className,
    activeColor = "text-primary",
    activeItem = null,
    onChange,
    onHover,
}: ExpandableTabsProps) {
    const [hovered, setHovered] = React.useState<number | null>(null);

    const handleMouseEnter = (index: number) => {
        setHovered(index);
        onHover?.(index);
    };

    const handleMouseLeave = () => {
        setHovered(null);
    };

    const handleClick = (index: number) => {
        onChange?.(index);
    };

    const Separator = () => (
        <div className="mx-2 h-[24px] w-[1px] bg-white/10" aria-hidden="true" />
    );

    return (
        <div
            className={cn(
                "flex items-center gap-1 rounded-full border border-white/5 bg-[#0a0805]/90 backdrop-blur-xl p-1.5 shadow-2xl",
                className
            )}
        >
            {tabs.map((tab, index) => {
                if (tab.type === "separator") {
                    return <Separator key={`separator-${index}`} />;
                }

                const Icon = tab.icon;
                const isSelected = hovered === index || activeItem === index;

                return (
                    <m.button
                        key={tab.title}
                        initial={false}
                        animate={{
                            backgroundColor: isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0)",
                        }}
                        onMouseEnter={() => handleMouseEnter(index)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick(index)}
                        className={cn(
                            "relative flex items-center rounded-full px-3 py-2 transition-colors duration-300",
                            isSelected ? activeColor : "text-slate-400 hover:text-white"
                        )}
                        aria-label={tab.title}
                    >
                        <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} className="transition-transform duration-300 flex-shrink-0" />
                        <AnimatePresence initial={false}>
                            {isSelected && (
                                <m.span
                                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    animate={{ width: "auto", opacity: 1, marginLeft: 8 }}
                                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden whitespace-nowrap text-[13px] font-bold tracking-wide"
                                >
                                    {tab.title}
                                </m.span>
                            )}
                        </AnimatePresence>
                    </m.button>
                );
            })}
        </div>
    );
}

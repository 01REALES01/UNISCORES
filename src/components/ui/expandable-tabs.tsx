"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

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
    onChange?: (index: number | null) => void;
}

const buttonVariants = {
    initial: {
        gap: 0,
        paddingLeft: ".5rem",
        paddingRight: ".5rem",
    },
    animate: (isSelected: boolean) => ({
        gap: isSelected ? ".5rem" : 0,
        paddingLeft: isSelected ? "1rem" : ".5rem",
        paddingRight: isSelected ? "1rem" : ".5rem",
    }),
};

const spanVariants = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "auto", opacity: 1 },
    exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring" as const, bounce: 0, duration: 0.6 };

export function ExpandableTabs({
    tabs,
    className,
    activeColor = "text-primary",
    onChange,
}: ExpandableTabsProps) {
    const [selected, setSelected] = React.useState<number | null>(null);
    const outsideClickRef = React.useRef<HTMLDivElement>(null);

    useOnClickOutside(outsideClickRef as any, () => {
        setSelected(null);
        onChange?.(null);
    });

    const handleSelect = (index: number) => {
        if (selected === index) {
            // Second click: trigger action
            onChange?.(index);
        } else {
            // First click: expand/select the tab
            setSelected(index);
        }
    };

    const Separator = () => (
        <div className="mx-1 h-[24px] w-[1.2px] bg-white/20" aria-hidden="true" />
    );

    return (
        <div
            ref={outsideClickRef}
            className={cn(
                "flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#17130D]/80 backdrop-blur-md p-1 shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                className
            )}
        >
            {tabs.map((tab, index) => {
                if (tab.type === "separator") {
                    return <Separator key={`separator-${index}`} />;
                }

                const Icon = tab.icon;
                return (
                    <motion.button
                        key={tab.title}
                        variants={buttonVariants}
                        initial={false}
                        animate="animate"
                        custom={selected === index}
                        onClick={() => handleSelect(index)}
                        transition={transition}
                        className={cn(
                            "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300 overflow-hidden",
                            selected === index
                                ? cn("bg-white/10 text-white shadow-sm ring-1 ring-white/20", activeColor)
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Icon size={20} />
                        <AnimatePresence initial={false}>
                            {selected === index && (
                                <motion.span
                                    variants={spanVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={transition}
                                    className="overflow-hidden whitespace-nowrap font-bold tracking-wide"
                                >
                                    {tab.title}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                );
            })}
        </div>
    );
}

"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
    undefined
);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
    return (
        <>
            <DesktopSidebar {...props} children={props.children as React.ReactNode} />
            <MobileSidebar {...(props as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof motion.div> & { children?: React.ReactNode }) => {
    const { open, setOpen, animate } = useSidebar();
    return (
        <motion.div
            className={cn(
                "h-full px-4 py-4 hidden md:flex md:flex-col bg-[#17130D]/90 backdrop-blur-2xl border-r border-white/5 w-[300px] flex-shrink-0 shadow-2xl shadow-red-900/10",
                className
            )}
            animate={{
                width: animate ? (open ? "300px" : "80px") : "300px",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            {...props}
        >
            {/* Sidebar Background Ambient Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-red-500/5 to-transparent" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            </div>

            {children}
        </motion.div>
    );
};

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) => {
    const { open, setOpen } = useSidebar();
    return (
        <>
            <div
                className={cn(
                    "h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-[#17130D]/90 backdrop-blur-2xl border-b border-white/5 w-full glass sticky top-0 z-30"
                )}
                {...props}
            >
                <div className="flex z-20 w-fit">
                    <Menu
                        className="text-white/50 hover:text-white cursor-pointer"
                        onClick={() => setOpen(!open)}
                    />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut",
                            }}
                            className={cn(
                                "fixed h-full w-full inset-0 bg-[#0a0805]/95 backdrop-blur-3xl p-10 z-[100] flex flex-col justify-between",
                                className
                            )}
                        >
                            <div
                                className="absolute right-10 top-10 z-50 text-white/50 hover:text-white cursor-pointer"
                                onClick={() => setOpen(!open)}
                            >
                                <X />
                            </div>
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export const SidebarLink = ({
    link,
    className,
    onClick,
    ...props
}: {
    link: Links;
    className?: string;
    onClick?: () => void;
    props?: LinkProps;
}) => {
    const { open, animate } = useSidebar();
    return (
        <Link
            href={link.href}
            onClick={onClick}
            className={cn(
                "flex items-center justify-start gap-4 group/sidebar py-3 px-3 rounded-2xl transition-all duration-300 overflow-hidden hover:bg-white/5 text-slate-400 hover:text-white hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]",
                className
            )}
            {...props}
        >
            <div className="relative z-10 flex min-w-[24px]">
                <div className="transition-transform duration-300 group-hover/sidebar:text-primary group-hover/sidebar:scale-110">
                    {link.icon}
                </div>
            </div>
            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-white text-sm font-medium transition duration-150 whitespace-pre inline-block !p-0 !m-0"
            >
                {link.label}
            </motion.span>
        </Link>
    );
};

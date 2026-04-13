"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, m } from "framer-motion";
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

export const SidebarBody = (props: React.ComponentProps<typeof m.div>) => {
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
}: React.ComponentProps<typeof m.div> & { children?: React.ReactNode }) => {
    const { open, setOpen, animate } = useSidebar();
    return (
        <m.div
            className={cn(
                "h-full px-3 py-3 hidden md:flex md:flex-col bg-background border-r border-white/8 flex-shrink-0",
                className
            )}
            animate={{
                width: animate ? (open ? "220px" : "64px") : "220px",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            {...props}
        >
            {children}
        </m.div>
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
                    "h-16 px-6 py-4 flex flex-row md:hidden items-center justify-between bg-background border-b border-white/5 w-full sticky top-0 z-[60] shadow-xl"
                )}
                {...props}
            >
                <div className="flex justify-between items-center w-full z-20">
                    <div className="flex items-center gap-3">
                        <img src="/uninorte_logo.png" alt="Logo" className="h-8 w-auto" />
                        <span className="text-sm font-black tracking-tighter text-white">ADMIN</span>
                    </div>
                    <Menu
                        className="text-white hover:text-red-500 transition-colors cursor-pointer"
                        size={24}
                        onClick={() => setOpen(!open)}
                    />
                </div>
                <AnimatePresence>
                    {open && (
                        <m.div
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut",
                            }}
                            className={cn(
                                "fixed h-full w-[240px] inset-y-0 left-0 bg-background p-5 z-[100] flex flex-col justify-between border-r border-white/8",
                                className
                            )}
                        >
                            <div className="flex flex-col h-full relative">
                                <div
                                    className="absolute right-0 top-0 z-50 text-white/50 hover:text-white cursor-pointer p-2"
                                    onClick={() => setOpen(false)}
                                >
                                    <X size={20} />
                                </div>
                                <div className="mt-8 flex-1 overflow-y-auto">
                                    {children}
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
                {/* Backdrop overlay */}
                <AnimatePresence>
                    {open && (
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
                        />
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
                "flex items-center group/sidebar py-2 rounded-lg transition-colors duration-150 overflow-hidden hover:bg-white/5 text-slate-400 hover:text-white",
                animate ? (open ? "justify-start gap-3 px-2.5" : "justify-center gap-0 px-0") : "justify-start gap-3 px-2.5",
                className
            )}
            {...props}
        >
            <div className="flex min-w-[20px] items-center justify-center flex-shrink-0">
                <div className="flex items-center justify-center">
                    {link.icon}
                </div>
            </div>
            <m.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-white text-sm font-medium transition duration-150 whitespace-pre inline-block !p-0 !m-0"
            >
                {link.label}
            </m.span>
        </Link>
    );
};

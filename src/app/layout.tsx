import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Olimpiadas Deportivas | UNINORTE 2026",
  description: "Resultados en tiempo real de las Olimpiadas Deportivas Interprogramas UNINORTE 2026",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Olimpiadas",
  },
};

export const viewport = {
  themeColor: "#2D1248",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://uhsslexvmoecwvcjiwit.supabase.co" />
        <link rel="dns-prefetch" href="https://uhsslexvmoecwvcjiwit.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased relative`} suppressHydrationWarning>
        {/* Global Ambient Background - Acierta y gana style */}
        <div className="fixed inset-0 z-[-1] pointer-events-none opacity-40 mix-blend-screen overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-violet-600/30 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

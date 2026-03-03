import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Olimpiadas Universitarias | UNINORTE 2026",
  description: "Resultados en tiempo real de las Olimpiadas Universitarias UNINORTE",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo_bar.png",
    shortcut: "/logo_bar.png",
    apple: "/logo_bar.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Olimpiadas",
  },
};

export const viewport = {
  themeColor: "#0a0805",
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
        {/* DNS Preconnect — eliminates ~100-300ms TLS handshake on first Supabase request */}
        <link rel="preconnect" href="https://uhsslexvmoecwvcjiwit.supabase.co" />
        <link rel="dns-prefetch" href="https://uhsslexvmoecwvcjiwit.supabase.co" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

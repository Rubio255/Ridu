import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin", "latin-ext"], weight: ["600", "700"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = { title: "Ridu", description: "Pavežimas Vilniuje pagal sutartį: vaikams ir suaugusiems", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "Ridu", statusBarStyle: "default" }, icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png" }], apple: "/icon-192.png" } };
export const viewport: Viewport = { themeColor: "#0f4c45", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body className={`${display.variable} ${body.variable} antialiased`}>{children}</body>
    </html>
  );
}

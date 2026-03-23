import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Inter } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RURA Présence",
  description: "Gestion des présences et réservations de salles",
  manifest: "/manifest.json",
  themeColor: "#FF4E17",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RURA Présence",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${atkinson.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-brand-bg text-brand-text">
        <link rel="apple-touch-icon" href="/logo.png" />
        {children}
      </body>
    </html>
  );
}

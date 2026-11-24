import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Inter, Playfair_Display } from "next/font/google";
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

// Sous-titre éditorial, en italique uniquement.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-playfair",
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
    <html lang="fr" className={`${atkinson.variable} ${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-creme text-noir">
        <link rel="apple-touch-icon" href="/favicon.png" />
        {children}
      </body>
    </html>
  );
}

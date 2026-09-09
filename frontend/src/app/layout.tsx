import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FarmerProvider } from "@/context/FarmerContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digital Krishi Officer — AI Agricultural Advisory",
  description:
    "Your AI-powered Krishi Officer for crop advisory, disease diagnosis, mandi prices, and weather forecasts. Built for Indian farmers.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className="antialiased font-sans">
        <FarmerProvider>{children}</FarmerProvider>
      </body>
    </html>
  );
}

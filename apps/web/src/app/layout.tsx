import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/components/auth/ProtectedRoute";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://campushire.in"),
  title: {
    default: "CampusHire — The Future of Hiring, Today",
    template: "%s | CampusHire"
  },
  description:
    "India's most intelligent campus hiring ecosystem. Connect colleges, students, and recruiters on one powerful platform.",
  keywords: ["campus hiring", "placement", "internship", "jobs", "India"],
  openGraph: {
    title: "CampusHire — The Future of Hiring, Today",
    description:
      "India's most intelligent campus hiring ecosystem. Connect colleges, students, and recruiters on one powerful platform.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "en_IN",
    url: "https://campushire.in",
    siteName: "CampusHire"
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusHire — The Future of Hiring, Today",
    description: "India's most intelligent campus hiring ecosystem"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                className: "shadow-card"
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

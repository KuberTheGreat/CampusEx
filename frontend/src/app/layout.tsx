import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "CampusEx - Campus Stock Exchange",
  description: "Trade shares of your campus peers, bid on profiles, stake AURA on live events — CampusEx transforms your college into a dynamic virtual economy.",
  openGraph: {
    title: "CampusEx - Campus Stock Exchange",
    description: "Trade people like stocks. Your campus, your market.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} suppressHydrationWarning>
        <Providers>
          <ThemeProvider>
            <AuthProvider>
              <Toaster position="top-right" />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

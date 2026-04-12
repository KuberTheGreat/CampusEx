import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "CampusEx - Virtual Economy",
  description: "Transform everyday college life into a dynamic virtual economy. Complete tasks, build credibility, and navigate the market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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

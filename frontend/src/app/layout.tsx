import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";

export const metadata: Metadata = {
  title: "Redash",
  description: "New Redash migration frontend",
  icons: {
    icon: [
      { url: "/static/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/static/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/static/images/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-[13px] text-slate-700 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

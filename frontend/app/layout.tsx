import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Lanchonete & Pastelaria — ERP & Automação",
  description: "Painel administrativo e App Mobile da Lanchonete & Pastelaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full dark">
      <body className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased font-sans">
        <AuthProvider>
          <AuthGuard>
            <div className="flex h-full w-full overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-zinc-950 h-full">
                <main className="flex-1 overflow-y-auto h-full">
                  {children}
                </main>
              </div>
            </div>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
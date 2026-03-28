import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-headline",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema ERP Web",
  description: "Frontend web do ERP de vendas",
};
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("erp-theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${manrope.variable} ${savedTheme === "light" ? "theme-light" : "theme-dark"}`}
      data-theme={savedTheme}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1"
          rel="stylesheet"
        />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider initialTheme={savedTheme}>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

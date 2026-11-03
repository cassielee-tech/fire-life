import type { Metadata } from "next";
import { getBaseCurrency } from "@/db/queries";
import { Nav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fire Life · 个人资产管理",
  description: "多账户、多币种资产总览与收益跟踪",
};

export const dynamic = "force-dynamic";

const themeScript = `(function(){try{var k="fire-life-theme";var s=localStorage.getItem(k);var m=s==="light"||s==="dark"||s==="system"?s:"dark";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const baseCurrency = getBaseCurrency();
  return (
    <html
      lang="zh-CN"
      className="dark h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Nav baseCurrency={baseCurrency} />
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="mx-auto w-full max-w-[1440px]">{children}</div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

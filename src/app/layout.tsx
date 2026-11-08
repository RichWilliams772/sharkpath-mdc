import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { OceanBackground } from "@/components/brand/ocean-background";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { authEnabled } from "@/lib/auth0";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "SharkPath — Navigate your career", template: "%s · SharkPath" },
  description:
    "Map your Miami Dade College pathway to a career: branching pathway map, live what-if planning, ROI, deadlines and an AI counselor team.",
};

export const viewport: Viewport = { themeColor: "#021526" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers authEnabled={authEnabled}>
          <OceanBackground />
          <SiteHeader />
          <main className="relative flex-1">{children}</main>
          <SiteFooter />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}

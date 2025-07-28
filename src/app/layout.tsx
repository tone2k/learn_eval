import "~/styles/globals.css";

import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { SessionProviderWrapper } from "~/components/session-provider";
import { auth } from "~/server/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "411 - Deep Research Assistant",
  description: "AI-powered research assistant that goes beyond simple search to deliver comprehensive, well-researched answers.",
  icons: [
    { rel: "icon", url: "/logo.png", sizes: "any" },
    { rel: "apple-touch-icon", url: "/logo.png" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  
  return (
    <html lang="en" className={inter.className}>
      <body>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

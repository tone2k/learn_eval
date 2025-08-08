import "~/styles/globals.css";

import { type Metadata } from "next";
import { SessionProviderWrapper } from "~/components/session-provider";
import { auth } from "~/server/auth";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "411 - Deep Research Assistant",
  description:
    "AI-powered research assistant that goes beyond simple search to deliver comprehensive, well-researched answers.",
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
    <html lang="en" className={GeistSans.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <SessionProviderWrapper session={session}>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}

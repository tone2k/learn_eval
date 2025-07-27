import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { SessionProviderWrapper } from "~/components/session-provider";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "411 - Deep Research Assistant",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

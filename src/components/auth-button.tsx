"use client";

import { signIn, signOut } from "next-auth/react";
import { siDiscord } from "simple-icons/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface AuthButtonProps {
  isAuthenticated: boolean;
  userImage: string | null | undefined;
}

export function AuthButton({ isAuthenticated, userImage }: AuthButtonProps) {
  const router = useRouter();

  return isAuthenticated ? (
    <div className="glass-card flex items-center gap-3 rounded-xl p-3 transition-all hover:border-white/20">
      {userImage && (
        <div className="relative">
          <div className="absolute inset-0 bg-accent rounded-full blur-md opacity-30"></div>
          <Image
            src={userImage}
            alt="User avatar"
            width={32}
            height={32}
            className="rounded-full relative border border-white/20"
          />
        </div>
      )}
      <button
        onClick={() => {
          router.push("/");
          void signOut();
        }}
        className="flex w-full items-center justify-center text-sm text-gray-300 font-light hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-lg"
      >
        Sign out
      </button>
    </div>
  ) : (
    <button
      onClick={() => void signIn("discord")}
      className="button-gradient flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm text-white font-medium shadow-lg transition-all hover:shadow-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d={siDiscord.path} />
      </svg>
      Sign in with Discord
    </button>
  );
}

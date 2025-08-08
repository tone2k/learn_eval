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
    <div className="flex items-center gap-2 rounded-lg bg-white/80 p-2 text-slate-900 border border-slate-200 hover:bg-white dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-800 dark:hover:bg-slate-900">
      {userImage && (
        <Image
          src={userImage}
          alt="User avatar"
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <button
        onClick={() => {
          router.push("/");
          void signOut();
        }}
        className="flex w-full items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:text-white"
      >
        Sign out
      </button>
    </div>
  ) : (
    <button
      onClick={() => void signIn("discord")}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 p-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d={siDiscord.path} />
      </svg>
      Sign in
    </button>
  );
}

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
    <div className="hover:bg-pink-100 flex items-center gap-2 rounded-lg bg-white p-2 text-navy-900 border border-pink-200">
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
        className="flex w-full items-center justify-center p-1 text-sm text-navy-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        Sign out
      </button>
    </div>
  ) : (
    <button
      onClick={() => void signIn("discord")}
      className="hover:bg-pink-100 flex w-full items-center justify-center gap-2 rounded-lg bg-white p-3 text-sm text-navy-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 border border-pink-200"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d={siDiscord.path} />
      </svg>
      Sign in
    </button>
  );
}

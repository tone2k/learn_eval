"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export const NewChatButton = () => {
  const router = useRouter();

  const handleNewChat = () => {
    router.push("/");
  };

  return (
    <button
      onClick={handleNewChat}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-navy-900 hover:bg-pink-50 hover:text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-pink-200 hover:border-pink-400 transition-colors"
      title="New Research"
    >
      <PlusIcon className="h-5 w-5" />
    </button>
  );
};
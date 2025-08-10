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
      className="flex size-9 items-center justify-center rounded-lg glass-card text-gray-400 hover:text-white hover:border-accent/40 hover:shadow-md hover:shadow-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
      title="New Research"
    >
      <PlusIcon className="size-4" />
    </button>
  );
};
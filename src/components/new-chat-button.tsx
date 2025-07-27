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
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      title="New Research"
    >
      <PlusIcon className="h-5 w-5" />
    </button>
  );
};
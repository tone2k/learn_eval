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
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 hover:bg-slate-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 hover:border-slate-300 transition-colors dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:border-slate-800"
      title="New Research"
    >
      <PlusIcon className="h-5 w-5" />
    </button>
  );
};
"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteChatButtonProps {
  chatId: string;
  isActiveChatId?: boolean;
}

export const DeleteChatButton = ({ chatId, isActiveChatId }: DeleteChatButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      setError(null);
      return;
    }

    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/chat/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to delete chat: ${response.statusText}`);
      }

      // If we're deleting the currently active chat, redirect to home
      if (isActiveChatId) {
        router.push("/");
      } else {
        // Refresh the page to update the chat list
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete chat";
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setError(null);
  };

  // Handle click outside to cancel confirmation
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showConfirm) {
      handleCancel();
    } else if (!isDeleting) {
      void handleDelete();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isDeleting}
        className={`flex items-center justify-center rounded p-1 transition-colors ${
          showConfirm 
            ? "bg-red-600 text-white" 
            : "text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800"
        } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
        title={showConfirm ? "Click again to confirm deletion" : "Delete chat"}
      >
        <Trash2 className="size-4" />
      </button>
      
      {showConfirm && (
        <div className="absolute right-0 top-8 z-10 w-56 rounded bg-white border border-slate-200 p-3 shadow-lg dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs text-slate-700 dark:text-slate-200 font-medium mb-2">Delete this chat?</p>
          {error && (
            <p className="text-xs text-red-600 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              disabled={isDeleting}
              className="flex-1 rounded bg-slate-200 px-2 py-1 text-xs text-slate-900 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
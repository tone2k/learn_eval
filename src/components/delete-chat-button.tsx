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
        className={`flex items-center justify-center rounded-lg p-1.5 transition-all ${
          showConfirm 
            ? "bg-red-500/20 text-red-400 border border-red-500/40" 
            : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
        } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
        title={showConfirm ? "Click again to confirm deletion" : "Delete chat"}
      >
        <Trash2 className="size-3.5" />
      </button>
      
      {showConfirm && (
        <div className="absolute right-0 top-8 z-10 w-48 rounded-xl glass-card p-3 shadow-xl animate-slide-up">
          <p className="text-xs text-gray-300 font-medium mb-2">Delete this chat?</p>
          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-red-500/20 border border-red-500/40 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-all"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-white/10 border border-white/20 px-2 py-1.5 text-xs text-gray-300 hover:bg-white/20 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
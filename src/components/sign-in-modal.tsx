import { signIn } from "next-auth/react";
import { siDiscord } from "simple-icons/icons";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal = ({ isOpen, onClose }: SignInModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl glass-card border-accent/20 p-8 shadow-2xl shadow-accent/20 animate-slide-up">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 size-16 rounded-full bg-gradient-to-r from-accent to-primary-500 p-0.5">
            <div className="flex size-full items-center justify-center rounded-full bg-slate-900">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gradient">
            Authentication Required
          </h2>
          <p className="text-gray-400">
            Sign in to unlock deep research capabilities
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => void signIn("discord")}
            className="button-gradient flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white font-medium shadow-lg transition-all hover:shadow-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d={siDiscord.path} />
            </svg>
            Continue with Discord
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-6 py-3 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

import Image from "next/image";

interface AppHeaderProps {
  size?: "small" | "large";
  showSubtitle?: boolean;
  className?: string;
}

export const AppHeader = ({ 
  size = "small", 
  showSubtitle = true, 
  className = "" 
}: AppHeaderProps) => {
  const logoSize = size === "large" ? 160 : 40;
  const subtitleSize = size === "large" ? "text-sm" : "text-xs";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary-500 rounded-lg blur-md opacity-50"></div>
        <Image 
          src="/logo.png" 
          alt="411 logo" 
          width={logoSize} 
          height={logoSize}
          className="rounded-lg flex-shrink-0 relative shadow-xl"
          priority
        />
      </div>
      {showSubtitle && (
        <span className={`${subtitleSize} text-gray-400 font-light`}>Deep Research</span>
      )}
    </div>
  );
};
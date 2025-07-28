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
  const logoSize = size === "large" ? 160 : 96;
  const subtitleSize = size === "large" ? "text-sm" : "text-xs";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image 
        src="/logo.png" 
        alt="411 logo" 
        width={logoSize} 
        height={logoSize}
        className="rounded flex-shrink-0"
        priority
      />
      {showSubtitle}
    </div>
  );
};
import Image from "next/image";

interface AppHeaderProps {
  size?: "small" | "large";
  showSubtitle?: boolean;
  className?: string;
}

export const AppHeader = ({
  size = "small",
  showSubtitle = true,
  className = "",
}: AppHeaderProps) => {
  const logoSize = size === "large" ? 48 : 32;
  const titleSize = size === "large" ? "text-xl" : "text-base";
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
      <div className="min-w-0">
        <div className={`font-semibold leading-tight ${titleSize}`}>411</div>
        {showSubtitle && (
          <div className={`text-slate-500 ${subtitleSize} leading-tight`}>Deep Research Assistant</div>
        )}
      </div>
    </div>
  );
};
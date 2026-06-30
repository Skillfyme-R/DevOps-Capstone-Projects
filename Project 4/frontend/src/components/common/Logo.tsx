import { Shield } from "lucide-react";
import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

const sizes = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };
const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

export function Logo({ className, size = "md", showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <Shield
          className={cn(sizes[size], "fill-brand-500 stroke-brand-300")}
          strokeWidth={1.5}
        />
      </div>
      {showWordmark && (
        <span className={cn("font-bold tracking-tight text-white", textSizes[size])}>
          Shield<span className="text-brand-400">Grid</span>
        </span>
      )}
    </div>
  );
}

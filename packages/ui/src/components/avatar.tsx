import * as React from "react";
import { cn } from "./lib";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback: string;
}

export const Avatar = ({ src, alt, fallback, className, ...props }: AvatarProps) => {
  return (
    <div
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-medium text-slate-700",
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
};

"use client";

import { useState } from "react";

interface AvatarProps {
  userId?: number | string;
  name?: string;
  size?: number;
  className?: string;
}

/**
 * DiceBear avatar using the Micah style.
 * Generates a unique avatar based on {name}{userId}.
 * Falls back to first-letter initial if image fails.
 */
export default function Avatar({ userId, name, size = 40, className = "" }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const seed = `${name || "user"}${userId || 0}`;
  const src = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}`;
  const initial = (name || "U")[0].toUpperCase();

  if (hasError) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: "var(--primary)",
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || "User avatar"}
      width={size}
      height={size}
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: "var(--bg-hover)" }}
      onError={() => setHasError(true)}
    />
  );
}

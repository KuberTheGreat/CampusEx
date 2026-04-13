"use client";

/**
 * Playful, expressive SVG icons for the Gen-Z UI.
 * Each icon is hand-crafted to feel bold and slightly exaggerated.
 * NO emojis — only SVG.
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

function wrap(size: number, className: string, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`flex-shrink-0 ${className}`} xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

export function IconMarket({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M3 20L7 8L11 14L15 6L21 20" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="15" cy="6" r="2" fill={color} opacity="0.6" />
  </>);
}

export function IconPortfolio({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <rect x="3" y="7" width="18" height="14" rx="3" stroke={color} strokeWidth="2" />
    <path d="M8 7V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V7" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="14" r="2.5" fill={color} opacity="0.5" />
  </>);
}

export function IconGlobe({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth="1.5" />
    <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.5" />
  </>);
}

export function IconEvents({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18L6 21.5L7 14.5L2 9.5L9 8.5Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={color} fillOpacity="0.15" />
  </>);
}

export function IconHeart({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M12 21C12 21 3 14 3 8.5C3 5.5 5.5 3 8 3C9.7 3 11.2 3.9 12 5.2C12.8 3.9 14.3 3 16 3C18.5 3 21 5.5 21 8.5C21 14 12 21 12 21Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" />
  </>);
}

export function IconFire({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M12 22C8 22 5 19 5 15C5 11 8 9 9 7C10 9.5 11 10 12 8C13 10 15 11 15 15C15 15.5 15 16 14.8 16.5C16 15.5 17 13 17 11C19 13 19 15 19 16C19 19 16 22 12 22Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" />
  </>);
}

export function IconNews({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="2" />
    <line x1="7" y1="8" x2="17" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="7" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="7" y1="16" x2="12" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="16" cy="15" r="2" fill={color} opacity="0.4" />
  </>);
}

export function IconPen({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M16.5 3.5L20.5 7.5L8 20H4V16L16.5 3.5Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <line x1="14" y1="6" x2="18" y2="10" stroke={color} strokeWidth="1.5" />
  </>);
}

export function IconLightning({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={color} fillOpacity="0.2" />
  </>);
}

export function IconMoon({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.15" />
  </>);
}

export function IconSun({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line key={deg} x1="12" y1="2" x2="12" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round"
        transform={`rotate(${deg} 12 12)`} />
    ))}
  </>);
}

export function IconCrown({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M2 18L4 8L8 12L12 4L16 12L20 8L22 18H2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={color} fillOpacity="0.25" />
  </>);
}

export function IconTrendUp({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <polyline points="4 16 8 12 12 14 20 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16 6 20 6 20 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}

export function IconTrendDown({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <polyline points="4 8 8 12 12 10 20 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16 18 20 18 20 14" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}

export function IconGavel({ size = 24, color = "currentColor", className = "" }: IconProps) {
  return wrap(size, className, <>
    <path d="M14.5 3.5L20.5 9.5L18 12L12 6L14.5 3.5Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" />
    <path d="M10 8L4 14L6 16L12 10" stroke={color} strokeWidth="2" />
    <line x1="2" y1="20" x2="10" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </>);
}

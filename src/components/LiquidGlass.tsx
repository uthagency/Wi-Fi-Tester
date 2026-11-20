import React, { useId } from 'react';

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'header' | 'aside' | 'article';
  backdropBlur?: number;
  tintColor?: string;
  displacementScale?: number;
  turbulenceBaseFrequency?: number;
  turbulenceSeed?: number;
  glassBorder?: boolean;
  children: React.ReactNode;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  as = 'div',
  backdropBlur = 10,
  tintColor = 'rgba(255, 255, 255, 0.16)',
  displacementScale = 150,
  turbulenceBaseFrequency = 0.002,
  turbulenceSeed = 3.5,
  glassBorder = true,
  className = '',
  style,
  children,
  ...rest
}) => {
  const rawId = useId();
  const filterId = `liquid-glass-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const Tag = as;

  return (
    <Tag
      className={`relative overflow-hidden rounded-none text-white ${className}`}
      style={{
        ...style,
        borderRadius: 0,
        boxShadow: glassBorder
          ? 'inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0 rgba(255, 255, 255, 0.14), 0 18px 42px -12px rgba(2, 6, 23, 0.58)'
          : '0 14px 36px -12px rgba(2, 6, 23, 0.5)',
        border: glassBorder ? '1px solid rgba(255, 255, 255, 0.34)' : 'none',
      }}
      {...rest}
    >
      {/* Hidden SVG turbulence/displacement filter for liquid specular refraction */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      >
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={turbulenceBaseFrequency}
              numOctaves={2}
              seed={turbulenceSeed}
              result="liquidNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="liquidNoise"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Clear frosted backdrop + readability luminance stabilizer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-none"
        style={{
          borderRadius: 0,
          backgroundColor: tintColor,
          backdropFilter: `blur(${backdropBlur}px) brightness(0.62) saturate(1.38)`,
          WebkitBackdropFilter: `blur(${backdropBlur}px) brightness(0.62) saturate(1.38)`,
        }}
      />

      {/* Organic liquid-bent specular light sheen (isolated from text for razor-sharp legibility) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 z-0 rounded-none opacity-25"
        style={{
          borderRadius: 0,
          filter: `url(#${filterId})`,
          background:
            'linear-gradient(128deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.06) 44%, rgba(186, 230, 253, 0.24) 72%, rgba(255, 255, 255, 0.35) 100%)',
        }}
      />

      {/* Sharp foreground content */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between">
        {children}
      </div>
    </Tag>
  );
};

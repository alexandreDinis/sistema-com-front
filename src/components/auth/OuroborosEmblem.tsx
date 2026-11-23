import React, { useId } from 'react';

interface OuroborosEmblemProps {
    size?: 'lg' | 'sm';
    monogram?: string;
}

export const OuroborosEmblem: React.FC<OuroborosEmblemProps> = ({
    size = 'lg',
    monogram = 'MD',
}) => {
    const uid = useId().replace(/:/g, '');
    const goldGradId = `oroGold-${uid}`;
    const shineGradId = `oroShine-${uid}`;
    const isSmall = size === 'sm';

    return (
        <div
            className={`relative flex items-center justify-center select-none ${
                isSmall ? 'w-20 h-20' : 'w-52 h-52'
            }`}
            aria-hidden="true"
        >
            <div
                className="oro-glow absolute inset-[14%] rounded-full pointer-events-none"
                style={{
                    background:
                        'radial-gradient(circle, rgba(212, 175, 55, 0.24) 0%, rgba(212, 175, 55, 0.04) 55%, transparent 72%)',
                }}
            />

            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 200" fill="none">
                <defs>
                    <linearGradient id={goldGradId} x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#f7df8b" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#8b6b18" />
                    </linearGradient>
                    <linearGradient id={shineGradId} x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fff4c4" />
                        <stop offset="100%" stopColor="#d4af37" />
                    </linearGradient>
                </defs>

                {/* Outer subtle orbital ticks */}
                <g className="oro-ring-outer" opacity="0.45">
                    <circle
                        cx="100"
                        cy="100"
                        r="88"
                        stroke={`url(#${goldGradId})`}
                        strokeWidth={isSmall ? '1.5' : '1'}
                        strokeDasharray="3 9"
                    />
                    {!isSmall && (
                        <>
                            <circle cx="100" cy="12" r="2.5" fill="#f3d778" />
                            <circle cx="100" cy="188" r="2" fill="#d4af37" />
                        </>
                    )}
                </g>

                {/* Inner counter-rotating ring */}
                {!isSmall && (
                    <g className="oro-ring-inner" opacity="0.32">
                        <circle
                            cx="100"
                            cy="100"
                            r="54"
                            stroke="#d4af37"
                            strokeWidth="1"
                            strokeDasharray="14 8"
                        />
                    </g>
                )}

                {/* Main Ouroboros Serpent Ring */}
                <g className="oro-serpent">
                    <circle
                        cx="100"
                        cy="100"
                        r="70"
                        stroke={`url(#${goldGradId})`}
                        strokeWidth={isSmall ? '10' : '9'}
                        strokeLinecap="round"
                        opacity="0.9"
                    />
                    {!isSmall && (
                        <circle
                            cx="100"
                            cy="100"
                            r="70"
                            stroke="#090b10"
                            strokeWidth="4"
                            strokeDasharray="2 8"
                            opacity="0.45"
                        />
                    )}
                    <circle
                        className="oro-energy"
                        cx="100"
                        cy="100"
                        r="70"
                        stroke={`url(#${shineGradId})`}
                        strokeWidth={isSmall ? '4' : '3.5'}
                        strokeLinecap="round"
                    />

                    {/* Serpent Head biting the tail */}
                    <path
                        d="M95 21 C106 18 117 24 120 31 C114 37 104 39 95 36 L101 30 Z"
                        fill="#f3d778"
                        stroke="#8b6b18"
                        strokeWidth="1.2"
                    />
                    <circle cx="109" cy="27.5" r={isSmall ? '2' : '1.8'} fill="#090b10" />
                    <path
                        d="M84 31 C88 29 93 29 99 30"
                        stroke="#f7df8b"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </g>

                {/* Center monogram */}
                <text
                    x="100"
                    y={isSmall ? '108' : '106'}
                    textAnchor="middle"
                    fill="#f3d778"
                    fontSize={isSmall ? '26' : '22'}
                    fontWeight="800"
                    letterSpacing="2"
                    fontFamily="Inter, system-ui, sans-serif"
                >
                    {monogram}
                </text>
            </svg>
        </div>
    );
};

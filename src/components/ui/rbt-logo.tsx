import React from 'react';

interface RBTLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: 'ENGENHARIA' | 'ORÇAMENTOS' | 'FUNDAÇÕES';
  boxed?: boolean;
  className?: string;
}

export function RBTLogo({
  size = 'md',
  subtitle = 'ORÇAMENTOS',
  boxed = false,
  className = '',
}: RBTLogoProps) {
  const sizeMap = {
    sm: { width: 120, height: 35, rbtSize: 22, subSize: 7, bracketScale: 0.6 },
    md: { width: 170, height: 50, rbtSize: 30, subSize: 9.5, bracketScale: 0.8 },
    lg: { width: 220, height: 65, rbtSize: 38, subSize: 12, bracketScale: 1.0 },
    xl: { width: 280, height: 82, rbtSize: 48, subSize: 15, bracketScale: 1.25 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <svg
      viewBox="0 0 240 70"
      width={currentSize.width}
      height={currentSize.height}
      className="select-none inline-block overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Elemento gráfico: Bracket / Gancho Estrutural Vermelho */}
      <path
        d="M 12 12 L 28 12 L 28 18 L 19 18 L 19 50 L 28 50 L 28 56 L 12 56 Z"
        fill="#BA1A1A"
      />

      {/* Escrita em Vermelho: RBT */}
      <text
        x="36"
        y="44"
        fontFamily="'Arial Black', 'Montserrat', 'Helvetica', sans-serif"
        fontWeight="900"
        fontSize="38"
        fill="#BA1A1A"
        letterSpacing="-1"
      >
        RBT
      </text>

      {/* Escrita em Preto: ORÇAMENTOS / ENGENHARIA */}
      <text
        x="37"
        y="60"
        fontFamily="'Arial', 'Helvetica', sans-serif"
        fontWeight="800"
        fontSize="12"
        fill="#000000"
        letterSpacing="3.5"
      >
        {subtitle}
      </text>
    </svg>
  );

  if (boxed) {
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-slate-200/80 px-3.5 py-1.5 inline-flex items-center justify-center ${className}`}
      >
        {content}
      </div>
    );
  }

  return <div className={`inline-flex items-center ${className}`}>{content}</div>;
}

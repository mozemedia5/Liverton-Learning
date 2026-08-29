import React from 'react';

interface AskHannaIconProps {
  size?: number;
  showText?: boolean;
  active?: boolean;
  className?: string;
  alt?: string;
}

/** Shared Hanna mark using the supplied blue/cyan artwork. */
export const AskHannaIcon: React.FC<AskHannaIconProps> = ({
  size = 40,
  active = false,
  className = '',
  alt = 'Hanna',
}) => (
  <img
    src="/hanna-icon.jpg"
    width={size}
    height={size}
    alt={alt}
    className={`hanna-icon ${active ? 'hanna-icon--active' : ''} ${className}`}
    draggable={false}
  />
);

export default AskHannaIcon;

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { audio } from '../../audio/manager';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'quiet'; icon?: string };
export function MenuButton({ children, variant = 'primary', icon, onClick, onMouseEnter, onPointerDown, disabled, className = '', ...rest }: Props) {
  return <button className={`menu-button menu-button--${variant} ${className}`} disabled={disabled} onMouseEnter={event => { if (!disabled) audio.play('buttonHover'); onMouseEnter?.(event); }} onPointerDown={event => { if (!disabled && event.button === 0) audio.play('buttonClick'); onPointerDown?.(event); }} onClick={event => { if (!disabled && event.detail === 0) audio.play('buttonClick'); onClick?.(event); }} {...rest}>
    {icon && <span className="menu-button__icon" aria-hidden="true">{icon}</span>}<span>{children}</span><span className="menu-button__arrow" aria-hidden="true">↗</span>
  </button>;
}
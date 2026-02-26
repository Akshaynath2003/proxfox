import React from 'react';
import './Button.css';

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}) {
    return (
        <button
            className={`proxfox-btn proxfox-btn-${variant} proxfox-btn-${size} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

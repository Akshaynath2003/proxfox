import React from 'react';
import './Card.css';

export function Card({
    children,
    glass = false,
    hover = false,
    className = '',
    ...props
}) {
    return (
        <div
            className={`proxfox-card ${glass ? 'glass' : ''} ${hover ? 'hoverable' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

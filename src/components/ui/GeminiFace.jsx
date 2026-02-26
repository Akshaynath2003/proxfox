import React from 'react';
import './GeminiFace.css';

export function GeminiFace({
    state = 'idle', // idle, listening, thinking, speaking
    size = 120,
    className = ''
}) {
    return (
        <div
            className={`gemini-face-container ${state} ${className}`}
            style={{ width: size, height: size }}
        >
            <div className="gemini-aura"></div>
            <div className="gemini-core">
                <div className="gemini-eye left"></div>
                <div className="gemini-eye right"></div>
                {state === 'speaking' && <div className="gemini-mouth"></div>}
            </div>
        </div>
    );
}

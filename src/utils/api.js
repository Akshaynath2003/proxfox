const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'https://proxfox-backend.onrender.com');
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const apiUrl = (path) => `${API_BASE}${path}`;

export const authHeader = () => {
    const stored = localStorage.getItem('proxfox_user');
    const token = stored ? JSON.parse(stored).token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export class ApiError extends Error {
    constructor(message, { status = null, code = 'API_ERROR', retryable = false, details = null } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.retryable = retryable;
        this.details = details;
    }
}

function looksLikeHtml(text = '') {
    return /<!doctype html|<html[\s>]/i.test(text);
}

async function readResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            return { isJson: true, data: await response.json(), rawText: '' };
        } catch {
            return { isJson: true, data: {}, rawText: '' };
        }
    }

    return { isJson: false, data: null, rawText: await response.text() };
}

export async function fetchJson(path, options = {}) {
    let response;

    try {
        response = await fetch(apiUrl(path), options);
    } catch {
        const devHint = import.meta.env.DEV
            ? ' Make sure the backend server is running (uvicorn on port 8000).'
            : '';
        throw new ApiError(
            'Unable to reach the backend right now. Please check your connection and try again.' + devHint,
            { code: 'NETWORK_ERROR', retryable: true }
        );
    }

    const { isJson, data, rawText } = await readResponse(response);

    if (isJson) {
        if (!response.ok) {
            throw new ApiError(
                data?.message || data?.detail || `Request failed with status ${response.status}.`,
                {
                    status: response.status,
                    code: 'API_ERROR',
                    retryable: RETRYABLE_STATUSES.has(response.status),
                    details: data,
                }
            );
        }
        return data;
    }

    const compactText = rawText.trim().replace(/\s+/g, ' ').slice(0, 140);
    const retryable = RETRYABLE_STATUSES.has(response.status) || looksLikeHtml(rawText);
    const message = retryable
        ? 'The backend is still waking up or temporarily unavailable. Please try again in a few seconds.'
        : (compactText ? `Unexpected server response: ${compactText}` : 'Unexpected server response from the backend.');

    throw new ApiError(message, {
        status: response.status,
        code: looksLikeHtml(rawText) ? 'HTML_RESPONSE' : 'NON_JSON_RESPONSE',
        retryable,
        details: compactText,
    });
}



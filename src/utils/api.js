// Shared API base URL — reads from env in production, falls back to '' for local dev proxy
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const apiUrl = (path) => `${API_BASE}${path}`;

export const authHeader = () => {
    const stored = localStorage.getItem('proxfox_user');
    const token = stored ? JSON.parse(stored).token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

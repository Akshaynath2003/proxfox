import React, { useState, useEffect } from 'react';
import { AuthContext } from './auth-context';
import { apiUrl, fetchJson } from '../utils/api';

async function warmUpServer(timeout = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const res = await fetch(apiUrl('/api/health'), { cache: 'no-store' });
            if (res.ok) return true;
        } catch {
            // Server still cold; keep retrying in the background.
        }
        await new Promise(r => setTimeout(r, 3000));
    }
    return false;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const storedUser = localStorage.getItem('proxfox_user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [serverReady, setServerReady] = useState(false);
    const [serverWaking, setServerWaking] = useState(false);
    const [serverError, setServerError] = useState(false);
    const loading = false;

    const runWarmUp = async (cancelled = { current: false }) => {
        setServerError(false);

        const quickCheck = await Promise.race([
            warmUpServer(1500),
            new Promise(r => setTimeout(() => r(false), 1500)),
        ]);
        if (cancelled.current) return;

        if (quickCheck) {
            setServerReady(true);
            setServerWaking(false);
            return;
        }

        setServerWaking(true);
        const ready = await warmUpServer(120000);
        if (!cancelled.current) {
            setServerReady(ready);
            setServerWaking(false);
            if (!ready) setServerError(true);
        }
    };

    useEffect(() => {
        const cancelled = { current: false };
        runWarmUp(cancelled);
        return () => { cancelled.current = true; };
    }, []);

    const retryConnection = () => {
        setServerError(false);
        setServerWaking(true);
        setServerReady(false);
        runWarmUp();
    };

    const persistUser = (data) => {
        setUser(data);
        localStorage.setItem('proxfox_user', JSON.stringify(data));
        setServerReady(true);
        setServerWaking(false);
        setServerError(false);
    };

    const login = async (email, password) => {
        try {
            const data = await fetchJson('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            persistUser(data);
            return { success: true, user: data };
        } catch (error) {
            console.error('Login error:', error);
            if (error.retryable) {
                setServerWaking(true);
            }
            return {
                success: false,
                error: error.message || 'Login failed.',
                status: error.status,
                retryable: Boolean(error.retryable),
                authFailure: [400, 401, 403].includes(error.status),
            };
        }
    };

    const register = async (userData) => {
        try {
            const data = await fetchJson('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            persistUser(data);
            return { success: true, user: data };
        } catch (error) {
            console.error('Registration error:', error);
            if (error.retryable) {
                setServerWaking(true);
            }
            return {
                success: false,
                error: error.message || 'Registration failed.',
                status: error.status,
                retryable: Boolean(error.retryable),
                authFailure: false,
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('proxfox_user');
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        serverReady,
        serverWaking,
        serverError,
        retryConnection,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

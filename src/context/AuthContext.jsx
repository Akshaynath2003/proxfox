import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Ping /api/health until the server responds or timeout (ms) is reached
async function warmUpServer(timeout = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/health`, { cache: 'no-store' });
            if (res.ok) return true;
        } catch (_) {
            // server still cold — keep retrying
        }
        await new Promise(r => setTimeout(r, 3000));
    }
    return false; // timed out
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [serverReady, setServerReady] = useState(false);
    const [serverWaking, setServerWaking] = useState(false);

    useEffect(() => {
        // Restore session from localStorage
        const storedUser = localStorage.getItem('proxfox_user');
        if (storedUser) setUser(JSON.parse(storedUser));
        setLoading(false);

        // Pre-warm the backend immediately
        let cancelled = false;
        (async () => {
            // Give it 1.5s — if not ready, show the waking banner
            const quickCheck = await Promise.race([
                warmUpServer(1500),
                new Promise(r => setTimeout(() => r(false), 1500)),
            ]);
            if (cancelled) return;
            if (quickCheck) {
                setServerReady(true);
                return;
            }
            // Still cold — show banner and keep retrying
            setServerWaking(true);
            const ready = await warmUpServer(60000);
            if (!cancelled) {
                setServerReady(ready);
                setServerWaking(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);


    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }
                setUser(data);
                localStorage.setItem('proxfox_user', JSON.stringify(data));
                return { success: true, user: data };
            } else {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    };

    const register = async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }
                setUser(data);
                localStorage.setItem('proxfox_user', JSON.stringify(data));
                return { success: true, user: data };
            } else {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
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
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

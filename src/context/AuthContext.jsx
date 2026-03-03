import React, { createContext, useState, useContext, useEffect } from 'react';

// Simulated default user states
// For the purpose of this demo, any user with username "admin" gets ad admin role
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate checking local storage for an existing session on load
        const storedUser = localStorage.getItem('proxfox_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch('/api/auth/login', {
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
            const response = await fetch('/api/auth/register', {
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
        isAuthenticated: !!user
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

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

    const login = async (username, password) => {
        // In a real app, this would be an API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const isAdmin = username.toLowerCase() === 'admin';
                const userData = {
                    username: username,
                    role: isAdmin ? 'admin' : 'user',
                    name: isAdmin ? 'Admin User' : 'Demo User'
                };

                setUser(userData);
                localStorage.setItem('proxfox_user', JSON.stringify(userData));
                resolve({ success: true, user: userData });
            }, 800); // Simulate network delay
        });
    };

    const register = async (userData) => {
        // Simulated registration logic
        return new Promise((resolve) => {
            setTimeout(() => {
                const isRegisteringAdmin = userData.username.toLowerCase() === 'admin';
                const newUser = {
                    ...userData,
                    role: isRegisteringAdmin ? 'admin' : 'user'
                };

                setUser(newUser);
                localStorage.setItem('proxfox_user', JSON.stringify(newUser));
                resolve({ success: true, user: newUser });
            }, 800);
        });
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

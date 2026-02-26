import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Wallet,
    PieChart,
    TrendingUp,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    Shield
} from 'lucide-react';
import './DashboardLayout.css';

const NAV_ITEMS = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Transactions', icon: Wallet, path: '/transactions' },
    { name: 'Analytics', icon: PieChart, path: '/analytics' },
    { name: 'Investments', icon: TrendingUp, path: '/investments' },
    { name: 'AI Advisor', icon: MessageSquare, path: '/ai-advisor' },
];

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // Conditionally add Admin route if user is admin
    const visibleNavItems = [...NAV_ITEMS];
    if (user?.role === 'admin') {
        visibleNavItems.push({ name: 'Admin', icon: Shield, path: '/admin' });
    }

    return (
        <div className="layout-container">
            {/* Mobile Header overlay */}
            <div className="mobile-header">
                <div className="logo-mobile">
                    <span className="logo-icon">🦊</span>
                    <span className="logo-text">ProxFox</span>
                </div>
                <button className="mobile-menu-btn" onClick={toggleSidebar}>
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">🦊</span>
                        <span className="logo-text">ProxFox</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        {visibleNavItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="nav-icon" size={20} />
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    {user && (
                        <div className="user-profile-summary">
                            <div className="profile-avatar-small">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="profile-details">
                                <span className="profile-name">{user.name || user.username}</span>
                                <span className="profile-role">{user.role}</span>
                            </div>
                        </div>
                    )}
                    <Link to="/settings" className="nav-link">
                        <Settings className="nav-icon" size={20} />
                        <span>Settings</span>
                    </Link>
                    <button className="nav-link logout-btn" onClick={logout}>
                        <LogOut className="nav-icon" size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <div className="content-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

import React from 'react';
import { Users, Shield, Settings, Activity } from 'lucide-react';
import { Card } from '../components/ui/Card';
import './Admin.css';

export function Admin() {
    const adminStats = [
        { label: 'Total Users', value: '1,248', icon: Users, change: '+12%' },
        { label: 'System Health', value: '99.9%', icon: Activity, change: 'Stable' },
        { label: 'Active Sessions', value: '42', icon: Shield, change: '+5' },
        { label: 'Pending Requests', value: '7', icon: Settings, change: '-2' },
    ];

    return (
        <div className="admin-container">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.875rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage users, system settings, and overview analytics.</p>
            </header>

            <div className="admin-stats-grid">
                {adminStats.map((stat, index) => (
                    <Card key={index} className="admin-stat-card">
                        <div className="stat-icon-wrapper">
                            <stat.icon size={24} className="stat-icon" />
                        </div>
                        <div className="stat-content">
                            <h3>{stat.label}</h3>
                            <div className="stat-value-row">
                                <span className="stat-value">{stat.value}</span>
                                <span className={`stat-change ${stat.change.startsWith('+') ? 'positive' : stat.change.startsWith('-') ? 'negative' : 'neutral'}`}>
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="admin-modules-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Card>
                    <div style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>User Management</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>View, edit, and manage user accounts and permissions.</p>
                        <button className="admin-btn">Manage Users</button>
                    </div>
                </Card>

                <Card>
                    <div style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>System Settings</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Configure global application preferences and API keys.</p>
                        <button className="admin-btn">Configure Settings</button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

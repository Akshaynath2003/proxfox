import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { User, Shield, Bell, Key, Smartphone, CreditCard } from 'lucide-react';
import './Settings.css';

export function Settings() {
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div className="page-container settings-page">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your account preferences and configurations.</p>
            </header>

            <div className="settings-layout">
                {/* Settings Sidebar */}
                <div className="settings-sidebar">
                    <nav className="settings-nav">
                        <button
                            className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            <User size={18} />
                            <span>Profile</span>
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <Shield size={18} />
                            <span>Security</span>
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <Bell size={18} />
                            <span>Notifications</span>
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'billing' ? 'active' : ''}`}
                            onClick={() => setActiveTab('billing')}
                        >
                            <CreditCard size={18} />
                            <span>Billing</span>
                        </button>
                    </nav>
                </div>

                {/* Settings Content */}
                <div className="settings-content">
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <h2 className="section-title">Public Profile</h2>
                            <Card className="settings-card">
                                <div className="profile-header">
                                    <div className="profile-avatar">
                                        <span>JD</span>
                                    </div>
                                    <div className="profile-actions">
                                        <button className="btn-primary">Change Avatar</button>
                                        <button className="btn-secondary">Remove</button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" className="form-input" defaultValue="John Doe" />
                                </div>

                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" className="form-input" defaultValue="john.doe@example.com" />
                                </div>

                                <div className="form-group">
                                    <label>Bio</label>
                                    <textarea className="form-input" rows="4" defaultValue="Software Engineer and personal finance enthusiast."></textarea>
                                </div>

                                <div className="form-actions">
                                    <button className="btn-primary">Save Changes</button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <h2 className="section-title">Security & Privacy</h2>
                            <Card className="settings-card">
                                <div className="security-item">
                                    <div className="security-info">
                                        <Key size={20} className="security-icon" />
                                        <div>
                                            <h4>Password</h4>
                                            <p>Last changed 3 months ago</p>
                                        </div>
                                    </div>
                                    <button className="btn-secondary">Update</button>
                                </div>

                                <hr className="divider" />

                                <div className="security-item">
                                    <div className="security-info">
                                        <Smartphone size={20} className="security-icon" />
                                        <div>
                                            <h4>Two-Factor Authentication</h4>
                                            <p>Add an extra layer of security to your account</p>
                                        </div>
                                    </div>
                                    <button className="btn-primary">Enable 2FA</button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2 className="section-title">Notification Preferences</h2>
                            <Card className="settings-card">
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Email Notifications</h4>
                                        <p>Receive weekly reports and transaction alerts</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                <hr className="divider" />

                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Push Notifications</h4>
                                        <p>Get instant alerts on your mobile device</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                <hr className="divider" />

                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Marketing Emails</h4>
                                        <p>Receive personalized offers and updates</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="settings-section">
                            <h2 className="section-title">Billing & Subscription</h2>
                            <Card className="settings-card">
                                <div className="billing-plan">
                                    <div className="plan-details">
                                        <span className="plan-badge">Pro Plan</span>
                                        <p className="plan-price">$9.99 / month</p>
                                        <p className="plan-renewal">Renews on Nov 24, 2023</p>
                                    </div>
                                    <button className="btn-secondary">Cancel Subscription</button>
                                </div>

                                <h4 className="payment-method-title">Payment Method</h4>
                                <div className="payment-method">
                                    <div className="card-info">
                                        <div className="card-icon">Visa</div>
                                        <span>•••• •••• •••• 4242</span>
                                    </div>
                                    <button className="btn-link">Edit</button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, LogIn, UserPlus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import './Auth.css';

export function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let result;
            if (isLogin) {
                if (!formData.username || !formData.password) {
                    throw new Error('Please enter both username and password');
                }
                result = await login(formData.username, formData.password);
            } else {
                if (!formData.username || !formData.email || !formData.phone || !formData.password) {
                    throw new Error('Please fill in all fields');
                }
                result = await register(formData);
            }

            if (result.success) {
                // Route based on role
                if (result.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setFormData({
            username: '',
            email: '',
            phone: '',
            password: ''
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-brand">
                <div className="logo-icon-large">🦊</div>
                <h1>ProxFox</h1>
                <p>AI-Powered Personal Finance</p>
            </div>

            <Card className="auth-card">
                <div className="auth-header">
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>
                        {isLogin
                            ? 'Enter your credentials to access your account'
                            : 'Sign up to start tracking your finances with AI'}
                    </p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Username</label>
                        <div className="input-with-icon">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder={isLogin ? "Enter any username" : "Choose a username"}
                                className="form-input icon-padding"
                            />
                        </div>
                        {isLogin && <small className="helper-text">Tip: Use "admin" to log in as an administrator.</small>}
                    </div>

                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label>Email Address</label>
                                <div className="input-with-icon">
                                    <Mail size={18} className="input-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="name@example.com"
                                        className="form-input icon-padding"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>
                                <div className="input-with-icon">
                                    <Phone size={18} className="input-icon" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+1 (555) 000-0000"
                                        className="form-input icon-padding"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                className="form-input icon-padding"
                            />
                        </div>
                    </div>

                    {isLogin && (
                        <div className="auth-options">
                            <label className="remember-me">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>
                            <button type="button" className="btn-link">Forgot password?</button>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`btn-primary w-full ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : (
                            isLogin ? <><LogIn size={18} className="btn-icon" /> Sign In</> : <><UserPlus size={18} className="btn-icon" /> Register</>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button type="button" onClick={toggleMode} className="btn-link toggle-btn">
                            {isLogin ? 'Sign up here' : 'Log in here'}
                        </button>
                    </p>
                </div>
            </Card>

            <div className="auth-bg-elements">
                <div className="bg-glow blob-1"></div>
                <div className="bg-glow blob-2"></div>
            </div>
        </div>
    );
}

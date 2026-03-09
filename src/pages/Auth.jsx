import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, LogIn, UserPlus, Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound, Send } from 'lucide-react';
import { Card } from '../components/ui/Card';
import './Auth.css';

const API_BASE = '/api';

// ---------- Validation Rules ----------
const RULES = {
    username: { minLength: 3, maxLength: 20, pattern: /^[a-zA-Z0-9_]+$/ },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { pattern: /^\+?[1-9]\d{9,14}$/ },
    password: {
        minLength: 8,
        hasUpper: /[A-Z]/,
        hasLower: /[a-z]/,
        hasNumber: /[0-9]/,
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
    },
};

function getPasswordIssues(pwd) {
    const issues = [];
    if (pwd.length < RULES.password.minLength) issues.push('At least 8 characters');
    if (!RULES.password.hasUpper.test(pwd)) issues.push('One uppercase letter (A–Z)');
    if (!RULES.password.hasLower.test(pwd)) issues.push('One lowercase letter (a–z)');
    if (!RULES.password.hasNumber.test(pwd)) issues.push('One number (0–9)');
    if (!RULES.password.hasSpecial.test(pwd)) issues.push('One special character (!@#$%…)');
    return issues;
}

function passwordStrength(pwd) {
    return [
        RULES.password.hasUpper.test(pwd),
        RULES.password.hasLower.test(pwd),
        RULES.password.hasNumber.test(pwd),
        RULES.password.hasSpecial.test(pwd),
        pwd.length >= RULES.password.minLength,
    ].filter(Boolean).length;
}

// ---- Standalone InputField (OUTSIDE Auth) to prevent cursor reset ----
function InputField({ label, icon, name, type, placeholder, value, error, isTouched, onChange, onBlur, extra }) {
    const hasError = isTouched && error;
    const isValid = isTouched && !error && value;
    return (
        <div className="form-group">
            <label>{label}</label>
            <div className="input-with-icon">
                <span className="input-icon">{icon}</span>
                <input
                    type={type || 'text'}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={`form-input icon-padding${hasError ? ' input-error' : ''}${isValid ? ' input-valid' : ''}`}
                    autoComplete={type === 'password' ? 'current-password' : 'on'}
                    spellCheck={false}
                />
                {extra}
            </div>
            {hasError && <span className="field-error-text">{error}</span>}
        </div>
    );
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;

// ══════════════════════════════════════════
//  FORGOT PASSWORD VIEW
// ══════════════════════════════════════════
function ForgotPasswordView({ onBack }) {
    const [email, setEmail] = useState('');
    const [emailErr, setEmailErr] = useState('');
    const [touched, setTouched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const validate = (v) => {
        if (!v) return 'Email is required.';
        if (!RULES.email.pattern.test(v)) return 'Enter a valid email address.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setTouched(true);
        const err = validate(email);
        setEmailErr(err);
        if (err) return;

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Something went wrong.');
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <>
                <div className="auth-header">
                    <h2>Check Your Email</h2>
                    <p>We've sent a password reset link to <strong>{email}</strong></p>
                </div>
                <div className="auth-success-banner">
                    <span className="success-icon">✉️</span>
                    <div>
                        <p className="success-title">Reset link sent!</p>
                        <p className="success-sub">Check your inbox (and spam folder). The link is valid for <strong>1 hour</strong>.</p>
                    </div>
                </div>
                <button type="button" className="btn-back-link" onClick={onBack}>
                    <ArrowLeft size={14} /> Back to Sign In
                </button>
            </>
        );
    }

    return (
        <>
            <div className="auth-header">
                <h2>Forgot Password</h2>
                <p>Enter your email and we'll send you a reset link</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="form-group">
                    <label>Email Address</label>
                    <div className="input-with-icon">
                        <span className="input-icon"><Mail size={18} /></span>
                        <input
                            type="email"
                            value={email}
                            onChange={e => {
                                setEmail(e.target.value);
                                if (touched) setEmailErr(validate(e.target.value));
                            }}
                            onBlur={() => { setTouched(true); setEmailErr(validate(email)); }}
                            placeholder="name@example.com"
                            className={`form-input icon-padding${touched && emailErr ? ' input-error' : ''}${touched && !emailErr && email ? ' input-valid' : ''}`}
                        />
                    </div>
                    {touched && emailErr && <span className="field-error-text">{emailErr}</span>}
                </div>

                <button
                    type="submit"
                    className={`btn-primary w-full ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? 'Sending...' : <><Send size={16} className="btn-icon" /> Send Reset Link</>}
                </button>
            </form>

            <button type="button" className="btn-back-link" onClick={onBack}>
                <ArrowLeft size={14} /> Back to Sign In
            </button>
        </>
    );
}

// ══════════════════════════════════════════
//  RESET PASSWORD VIEW
// ══════════════════════════════════════════
function ResetPasswordView({ token, onBack }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [showPwd, setShowPwd] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const pwdStrength = passwordStrength(formData.password);
    const pwdIssues = getPasswordIssues(formData.password);
    const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

    const validate = (name, value, pwd) => {
        if (name === 'password') {
            if (!value) return 'Password is required.';
            const issues = getPasswordIssues(value);
            return issues.length ? issues[0] : '';
        }
        if (name === 'confirmPassword') {
            if (!value) return 'Please confirm your password.';
            if (value !== (pwd ?? formData.password)) return 'Passwords do not match.';
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            setErrors(errs => ({
                ...errs,
                [name]: touched[name] ? validate(name, value, next.password) : errs[name],
                ...(name === 'password' && touched.confirmPassword
                    ? { confirmPassword: validate('confirmPassword', next.confirmPassword, value) }
                    : {}),
            }));
            return next;
        });
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(p => ({ ...p, [name]: true }));
        setErrors(p => ({ ...p, [name]: validate(name, value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = {
            password: validate('password', formData.password),
            confirmPassword: validate('confirmPassword', formData.confirmPassword, formData.password),
        };
        setErrors(errs);
        setTouched({ password: true, confirmPassword: true });
        if (Object.values(errs).some(v => v)) return;

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: formData.password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Something went wrong.');
            setSuccess(true);
            setTimeout(() => navigate('/auth', { replace: true }), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <>
                <div className="auth-header">
                    <h2>Password Reset!</h2>
                    <p>Your password has been updated successfully</p>
                </div>
                <div className="auth-success-banner">
                    <span className="success-icon">✅</span>
                    <div>
                        <p className="success-title">All done!</p>
                        <p className="success-sub">Redirecting you to sign in…</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="auth-header">
                <h2>Reset Password</h2>
                <p>Enter a new password for your account</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                {/* New Password */}
                <div className="form-group">
                    <label>New Password</label>
                    <div className="input-with-icon">
                        <span className="input-icon"><Lock size={18} /></span>
                        <input
                            type={showPwd ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="••••••••"
                            className={`form-input icon-padding icon-padding-right${touched.password && errors.password ? ' input-error' : ''}${touched.password && !errors.password && formData.password ? ' input-valid' : ''}`}
                            autoComplete="new-password"
                        />
                        <button type="button" className="toggle-eye" onClick={() => setShowPwd(p => !p)}>
                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {touched.password && errors.password && <span className="field-error-text">{errors.password}</span>}
                    {/* Strength meter */}
                    {formData.password && (
                        <div className="password-strength">
                            <div className="strength-bars">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="strength-bar"
                                        style={{ background: pwdStrength >= i ? strengthColors[pwdStrength] : 'var(--border-color)' }} />
                                ))}
                            </div>
                            <span className="strength-label" style={{ color: strengthColors[pwdStrength] }}>
                                {strengthLabels[pwdStrength]}
                            </span>
                            {pwdIssues.length > 0
                                ? <ul className="pwd-requirements">{pwdIssues.map(i => <li key={i} className="req-unmet">✗ {i}</li>)}</ul>
                                : <p className="req-all-met"><ShieldCheck size={13} /> All requirements met</p>
                            }
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="input-with-icon">
                        <span className="input-icon"><Lock size={18} /></span>
                        <input
                            type={showConf ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="••••••••"
                            className={`form-input icon-padding icon-padding-right${touched.confirmPassword && errors.confirmPassword ? ' input-error' : ''}${touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword ? ' input-valid' : ''}`}
                            autoComplete="new-password"
                        />
                        <button type="button" className="toggle-eye" onClick={() => setShowConf(p => !p)}>
                            {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && <span className="field-error-text">{errors.confirmPassword}</span>}
                </div>

                <button
                    type="submit"
                    className={`btn-primary w-full ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? 'Resetting...' : <><KeyRound size={16} className="btn-icon" /> Reset Password</>}
                </button>
            </form>

            <button type="button" className="btn-back-link" onClick={onBack}>
                <ArrowLeft size={14} /> Back to Sign In
            </button>
        </>
    );
}

// ══════════════════════════════════════════
//  MAIN AUTH COMPONENT
// ══════════════════════════════════════════
export function Auth() {
    const location = useLocation();
    const navigate = useNavigate();

    // Detect view from URL: ?token=xxx → 'reset', else 'login'
    const [view, setView] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('token') ? 'reset' : 'login';
    });

    // Pull reset token from URL
    const resetToken = new URLSearchParams(location.search).get('token') || '';

    // Re-sync view if user navigates to /auth?token=xxx after load
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('token')) setView('reset');
    }, [location.search]);

    // ── Login / Register state ──
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attempts, setAttempts] = useState(0);
    const [lockedUntil, setLockedUntil] = useState(null);
    const [touched, setTouched] = useState({});

    const { login, register } = useAuth();

    const validateField = useCallback((name, value, pwd) => {
        switch (name) {
            case 'username':
                if (!value) return 'Username is required.';
                if (value.length < RULES.username.minLength) return `At least ${RULES.username.minLength} characters.`;
                if (value.length > RULES.username.maxLength) return `Max ${RULES.username.maxLength} characters.`;
                if (!RULES.username.pattern.test(value)) return 'Only letters, numbers, or underscores.';
                return '';
            case 'email':
                if (!value) return 'Email is required.';
                if (!RULES.email.pattern.test(value)) return 'Enter a valid email address.';
                return '';
            case 'phoneNumber':
                if (!value) return 'Phone number is required.';
                if (!RULES.phone.pattern.test(value.replace(/\s|-/g, ''))) return 'Enter a valid phone number (10–15 digits).';
                return '';
            case 'password':
                if (!value) return 'Password is required.';
                const issues = getPasswordIssues(value);
                return issues.length ? issues[0] : '';
            case 'confirmPassword':
                if (!value) return 'Please confirm your password.';
                if (value !== (pwd ?? formData.password)) return 'Passwords do not match.';
                return '';
            default:
                return '';
        }
    }, [formData.password]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            setFieldErrors(errs => ({
                ...errs,
                [name]: touched[name] ? validateField(name, value, next.password) : errs[name],
                ...(name === 'password' && touched.confirmPassword
                    ? { confirmPassword: validateField('confirmPassword', next.confirmPassword, value) }
                    : {}),
            }));
            return next;
        });
    }, [touched, validateField]);

    const handleBlur = useCallback((e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }, [validateField]);

    const validateAll = (data) => {
        if (isLogin) {
            return {
                email: validateField('email', data.email),
                password: validateField('password', data.password),
            };
        }
        return {
            username: validateField('username', data.username),
            email: validateField('email', data.email),
            phoneNumber: validateField('phoneNumber', data.phoneNumber),
            password: validateField('password', data.password),
            confirmPassword: validateField('confirmPassword', data.confirmPassword, data.password),
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (lockedUntil && Date.now() < lockedUntil) {
            const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
            setError(`Too many failed attempts. Try again in ${secs}s.`);
            return;
        }

        const errs = validateAll(formData);
        setFieldErrors(errs);
        setTouched(isLogin
            ? { email: true, password: true }
            : { username: true, email: true, phoneNumber: true, password: true, confirmPassword: true }
        );
        if (Object.values(errs).some(v => v)) return;

        setIsLoading(true);
        try {
            const result = isLogin
                ? await login(formData.email, formData.password)
                : await register(formData);

            if (result.success) {
                setAttempts(0);
                navigate(result.user.role === 'admin' ? '/admin' : '/');
            } else {
                throw new Error(result.error || 'Authentication failed. Please try again.');
            }
        } catch (err) {
            const next = attempts + 1;
            setAttempts(next);
            if (isLogin && next >= MAX_LOGIN_ATTEMPTS) {
                setLockedUntil(Date.now() + LOCKOUT_MS);
                setError(`Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Wait 30 seconds.`);
            } else {
                const rem = isLogin ? MAX_LOGIN_ATTEMPTS - next : null;
                setError(
                    err.message +
                    (rem != null && rem > 0 && rem <= 3 ? ` (${rem} attempt${rem === 1 ? '' : 's'} left before lockout)` : '')
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(v => !v);
        setError(null);
        setFieldErrors({});
        setTouched({});
        setAttempts(0);
        setLockedUntil(null);
        setFormData({ username: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
    };

    const pwdStrength = passwordStrength(formData.password);
    const pwdIssues = getPasswordIssues(formData.password);
    const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

    const fieldProps = (name) => ({
        name,
        value: formData[name],
        error: fieldErrors[name],
        isTouched: touched[name],
        onChange: handleInputChange,
        onBlur: handleBlur,
    });

    const handleBackToLogin = () => {
        navigate('/auth', { replace: true });
        setView('login');
    };

    return (
        <div className="auth-container">
            <div className="auth-brand">
                <div className="logo-icon-large">🦊</div>
                <h1>ProxFox</h1>
                <p>AI-Powered Personal Finance</p>
            </div>

            <Card className="auth-card">

                {/* ── FORGOT PASSWORD VIEW ── */}
                {view === 'forgot' && (
                    <ForgotPasswordView onBack={handleBackToLogin} />
                )}

                {/* ── RESET PASSWORD VIEW ── */}
                {view === 'reset' && (
                    <ResetPasswordView token={resetToken} onBack={handleBackToLogin} />
                )}

                {/* ── LOGIN / REGISTER VIEW ── */}
                {view === 'login' && (
                    <>
                        <div className="auth-header">
                            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                            <p>
                                {isLogin
                                    ? 'Enter your credentials to access your account'
                                    : 'Sign up to start tracking your finances with AI'}
                            </p>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <form onSubmit={handleSubmit} className="auth-form" noValidate>

                            {/* Register: Username */}
                            {!isLogin && (
                                <InputField
                                    label="Username"
                                    icon={<User size={18} />}
                                    placeholder="e.g. john_doe"
                                    {...fieldProps('username')}
                                />
                            )}

                            {/* Email */}
                            <InputField
                                label="Email Address"
                                icon={<Mail size={18} />}
                                type="email"
                                placeholder="name@example.com"
                                {...fieldProps('email')}
                            />

                            {/* Register: Phone */}
                            {!isLogin && (
                                <InputField
                                    label="Phone Number"
                                    icon={<Phone size={18} />}
                                    type="tel"
                                    placeholder="+91 9876543210"
                                    {...fieldProps('phoneNumber')}
                                />
                            )}

                            {/* Password */}
                            <div className="form-group">
                                <label>Password</label>
                                <div className="input-with-icon">
                                    <span className="input-icon"><Lock size={18} /></span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        placeholder="••••••••"
                                        className={`form-input icon-padding icon-padding-right${touched.password && fieldErrors.password ? ' input-error' : ''}${touched.password && !fieldErrors.password && formData.password ? ' input-valid' : ''}`}
                                        autoComplete="current-password"
                                    />
                                    <button type="button" className="toggle-eye" onClick={() => setShowPassword(p => !p)}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {touched.password && fieldErrors.password && (
                                    <span className="field-error-text">{fieldErrors.password}</span>
                                )}
                                {/* Strength meter — register only */}
                                {!isLogin && formData.password && (
                                    <div className="password-strength">
                                        <div className="strength-bars">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="strength-bar"
                                                    style={{ background: pwdStrength >= i ? strengthColors[pwdStrength] : 'var(--border-color)' }} />
                                            ))}
                                        </div>
                                        <span className="strength-label" style={{ color: strengthColors[pwdStrength] }}>
                                            {strengthLabels[pwdStrength]}
                                        </span>
                                        {pwdIssues.length > 0
                                            ? <ul className="pwd-requirements">
                                                {pwdIssues.map(i => <li key={i} className="req-unmet">✗ {i}</li>)}
                                            </ul>
                                            : <p className="req-all-met"><ShieldCheck size={13} /> All requirements met</p>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Register: Confirm Password */}
                            {!isLogin && (
                                <div className="form-group">
                                    <label>Confirm Password</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"><Lock size={18} /></span>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            onBlur={handleBlur}
                                            placeholder="••••••••"
                                            className={`form-input icon-padding icon-padding-right${touched.confirmPassword && fieldErrors.confirmPassword ? ' input-error' : ''}${touched.confirmPassword && !fieldErrors.confirmPassword && formData.confirmPassword ? ' input-valid' : ''}`}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="toggle-eye" onClick={() => setShowConfirm(p => !p)}>
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {touched.confirmPassword && fieldErrors.confirmPassword && (
                                        <span className="field-error-text">{fieldErrors.confirmPassword}</span>
                                    )}
                                </div>
                            )}

                            {/* Login extras */}
                            {isLogin && (
                                <div className="auth-options">
                                    <label className="remember-me">
                                        <input type="checkbox" />
                                        <span>Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        className="btn-link"
                                        onClick={() => setView('forgot')}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                className={`btn-primary w-full ${isLoading ? 'loading' : ''}`}
                                disabled={isLoading || Boolean(lockedUntil && Date.now() < lockedUntil)}
                            >
                                {isLoading ? 'Processing...' : (
                                    isLogin
                                        ? <><LogIn size={18} className="btn-icon" /> Sign In</>
                                        : <><UserPlus size={18} className="btn-icon" /> Register</>
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>
                                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                                <button type="button" onClick={toggleMode} className="btn-link toggle-btn">
                                    {isLogin ? 'Sign up here' : 'Log in here'}
                                </button>
                            </p>
                        </div>
                    </>
                )}
            </Card>

            <div className="auth-bg-elements">
                <div className="bg-glow blob-1"></div>
                <div className="bg-glow blob-2"></div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { apiUrl, authHeader } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Target, Plus, X, Trash2, Edit2, TrendingUp, Check } from 'lucide-react';
import './Goals.css';

export function Goals() {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [form, setForm] = useState({ name: '', targetAmount: '', currentSavings: '', deadlineMonths: '12' });

    const fetchGoals = async () => {
        try {
            const res = await fetch(apiUrl('/api/goals'), { headers: authHeader() });
            if (res.ok) setGoals(await res.json());
        } catch (e) {
            console.error('Fetch goals error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGoals(); }, []);

    const handleSave = async () => {
        const method = editingGoal ? 'PUT' : 'POST';
        const url = editingGoal ? apiUrl(`/api/goals/${editingGoal._id}`) : apiUrl('/api/goals');
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    name: form.name,
                    targetAmount: parseFloat(form.targetAmount),
                    currentSavings: parseFloat(form.currentSavings || '0'),
                    deadlineMonths: parseInt(form.deadlineMonths || '12'),
                }),
            });
            if (res.ok) {
                setShowModal(false);
                setEditingGoal(null);
                resetForm();
                fetchGoals();
            }
        } catch (e) {
            console.error('Save goal error', e);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this goal?')) return;
        try {
            await fetch(apiUrl(`/api/goals/${id}`), { method: 'DELETE', headers: authHeader() });
            fetchGoals();
        } catch (e) {
            console.error('Delete goal error', e);
        }
    };

    const resetForm = () => setForm({ name: '', targetAmount: '', currentSavings: '', deadlineMonths: '12' });

    const openEdit = (g) => {
        setEditingGoal(g);
        setForm({
            name: g.name, targetAmount: String(g.targetAmount),
            currentSavings: String(g.currentSavings), deadlineMonths: String(g.deadlineMonths)
        });
        setShowModal(true);
    };

    const openNew = () => { setEditingGoal(null); resetForm(); setShowModal(true); };

    return (
        <div className="page-container goals-page">
            <header className="page-header flex-between">
                <div>
                    <h1 className="page-title">Savings Goals</h1>
                    <p className="page-subtitle">Plan and track your financial goals with smart savings insights.</p>
                </div>
                <button className="btn-primary" onClick={openNew}>
                    <Plus size={18} /> <span>New Goal</span>
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading goals...</div>
            ) : goals.length === 0 ? (
                <Card className="empty-goals">
                    <Target size={48} />
                    <h3>No savings goals yet</h3>
                    <p>Set your first financial goal to start tracking your progress!</p>
                    <button className="btn-primary" onClick={openNew}><Plus size={16} /> Create Goal</button>
                </Card>
            ) : (
                <div className="goals-grid">
                    {goals.map(g => {
                        const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentSavings / g.targetAmount) * 100)) : 0;
                        const isComplete = pct >= 100;
                        return (
                            <Card key={g._id} className={`goal-card ${isComplete ? 'complete' : ''}`}>
                                <div className="goal-header">
                                    <div className="goal-icon-wrap">
                                        {isComplete ? <Check size={20} /> : <Target size={20} />}
                                    </div>
                                    <div className="goal-actions">
                                        <button className="btn-icon-sm" onClick={() => openEdit(g)}><Edit2 size={14} /></button>
                                        <button className="btn-icon-sm danger" onClick={() => handleDelete(g._id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <h3 className="goal-name">{g.name}</h3>

                                <div className="goal-progress-bar">
                                    <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                                </div>
                                <div className="goal-progress-label">
                                    <span>${g.currentSavings.toFixed(0)} saved</span>
                                    <span>${g.targetAmount.toFixed(0)} target</span>
                                </div>

                                <div className="goal-stats">
                                    <div className="goal-stat">
                                        <span className="stat-label">Monthly Needed</span>
                                        <span className="stat-value">${g.monthlyNeeded.toFixed(2)}</span>
                                    </div>
                                    <div className="goal-stat">
                                        <span className="stat-label">Deadline</span>
                                        <span className="stat-value">{g.deadlineMonths} mo</span>
                                    </div>
                                    <div className="goal-stat">
                                        <span className="stat-label">Progress</span>
                                        <span className="stat-value">{pct}%</span>
                                    </div>
                                </div>

                                {isComplete && <div className="goal-complete-badge">🎉 Goal Achieved!</div>}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</h2>
                            <button onClick={() => setShowModal(false)} className="btn-close"><X size={20} /></button>
                        </div>
                        <div className="modal-form">
                            <div className="form-row">
                                <label>Goal Name</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. New Laptop, Emergency Fund" />
                            </div>
                            <div className="form-row-2col">
                                <div className="form-row">
                                    <label>Target Amount ($)</label>
                                    <input type="number" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="50000" />
                                </div>
                                <div className="form-row">
                                    <label>Current Savings ($)</label>
                                    <input type="number" value={form.currentSavings} onChange={e => setForm(f => ({ ...f, currentSavings: e.target.value }))} placeholder="0" />
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Deadline (months)</label>
                                <input type="number" value={form.deadlineMonths} onChange={e => setForm(f => ({ ...f, deadlineMonths: e.target.value }))} placeholder="12" />
                            </div>
                            <button className="btn-primary w-full" onClick={handleSave}>
                                {editingGoal ? 'Save Changes' : 'Create Goal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

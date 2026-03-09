import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal, Download, Plus, Sparkles, X, Trash2, Edit2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { apiUrl, authHeader } from '../utils/api';
import './Transactions.css';

export function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [aiText, setAiText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category: 'Other', date: new Date().toISOString().split('T')[0] });

    const categories = ['Food', 'Transport', 'Housing', 'Entertainment', 'Shopping', 'Health', 'Education', 'Utilities', 'Income', 'Other'];

    // ── Fetch transactions ──
    const fetchTransactions = async () => {
        try {
            const res = await fetch(apiUrl('/api/finance/transactions'), { headers: authHeader() });
            if (res.ok) setTransactions(await res.json());
        } catch (e) {
            console.error('Failed to fetch transactions', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransactions(); }, []);

    // ── Create / Update ──
    const handleSave = async () => {
        const method = editingTx ? 'PUT' : 'POST';
        const url = editingTx
            ? apiUrl(`/api/finance/transactions/${editingTx._id}`)
            : apiUrl('/api/finance/transactions');
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
            });
            if (res.ok) {
                setShowModal(false);
                setEditingTx(null);
                resetForm();
                fetchTransactions();
            }
        } catch (e) {
            console.error('Save failed', e);
        }
    };

    // ── Delete ──
    const handleDelete = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await fetch(apiUrl(`/api/finance/transactions/${id}`), {
                method: 'DELETE', headers: authHeader(),
            });
            fetchTransactions();
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    // ── AI Parse ──
    const handleAiParse = async () => {
        if (!aiText.trim()) return;
        setAiLoading(true);
        try {
            const res = await fetch(apiUrl('/api/ai/parse-expense'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ text: aiText }),
            });
            if (res.ok) {
                const parsed = await res.json();
                setForm({
                    description: parsed.description || aiText,
                    amount: String(parsed.amount || ''),
                    type: parsed.type || 'expense',
                    category: parsed.category || 'Other',
                    date: parsed.date || new Date().toISOString().split('T')[0],
                });
                setAiText('');
            }
        } catch (e) {
            console.error('AI parse failed', e);
        } finally {
            setAiLoading(false);
        }
    };

    const resetForm = () => setForm({ description: '', amount: '', type: 'expense', category: 'Other', date: new Date().toISOString().split('T')[0] });

    const openEdit = (tx) => {
        setEditingTx(tx);
        setForm({ description: tx.description, amount: String(tx.amount), type: tx.type, category: tx.category, date: (tx.date || '').split('T')[0] });
        setShowModal(true);
    };

    const openNew = () => {
        setEditingTx(null);
        resetForm();
        setShowModal(true);
    };

    const filtered = transactions.filter(t =>
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container transactions-page">
            <header className="page-header flex-between">
                <div>
                    <h1 className="page-title">Transactions</h1>
                    <p className="page-subtitle">View and manage your recent transactions.</p>
                </div>
                <button className="btn-primary" onClick={openNew}>
                    <Plus size={18} /> <span>Add Transaction</span>
                </button>
            </header>

            <Card className="transactions-card">
                <div className="transactions-toolbar">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input type="text" placeholder="Search transactions..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)} className="search-input" />
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading transactions...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="transactions-table">
                            <thead>
                                <tr>
                                    <th>Transaction</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th className="text-right">Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(tx => (
                                    <tr key={tx._id}>
                                        <td>
                                            <div className="tx-description">
                                                <div className={`tx-icon-wrapper ${tx.type}`}>
                                                    {tx.type === 'income' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <span className="tx-name">{tx.description}</span>
                                            </div>
                                        </td>
                                        <td><span className="tx-category">{tx.category}</span></td>
                                        <td><span className="tx-date">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></td>
                                        <td className="text-right">
                                            <span className={`tx-amount ${tx.type}`}>
                                                {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn-icon-sm" onClick={() => openEdit(tx)} title="Edit"><Edit2 size={14} /></button>
                                                <button className="btn-icon-sm danger" onClick={() => handleDelete(tx._id)} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center empty-state">
                                            {transactions.length === 0 ? 'No transactions yet. Click "Add Transaction" to get started!' : `No transactions found matching "${searchTerm}"`}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* ── Add/Edit Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
                            <button onClick={() => setShowModal(false)} className="btn-close"><X size={20} /></button>
                        </div>

                        {/* AI Quick Add */}
                        {!editingTx && (
                            <div className="ai-input-row">
                                <Sparkles size={16} className="ai-icon" />
                                <input type="text" placeholder='Try: "Spent 500 on groceries yesterday"'
                                    value={aiText} onChange={e => setAiText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAiParse()} className="ai-input" />
                                <button onClick={handleAiParse} disabled={aiLoading} className="btn-ai">
                                    {aiLoading ? 'Parsing...' : 'Parse with AI'}
                                </button>
                            </div>
                        )}

                        <div className="modal-form">
                            <div className="form-row">
                                <label>Description</label>
                                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Lunch at cafe" />
                            </div>
                            <div className="form-row-2col">
                                <div className="form-row">
                                    <label>Amount</label>
                                    <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                                </div>
                                <div className="form-row">
                                    <label>Type</label>
                                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row-2col">
                                <div className="form-row">
                                    <label>Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label>Date</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                            </div>
                            <button className="btn-primary w-full" onClick={handleSave}>
                                {editingTx ? 'Save Changes' : 'Add Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

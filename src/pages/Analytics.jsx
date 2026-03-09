import React, { useState, useEffect } from 'react';
import { apiUrl, authHeader } from '../utils/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import './Analytics.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function Analytics() {
    const [range, setRange] = useState('week');
    const [chartData, setChartData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [chartRes, catRes, sumRes] = await Promise.all([
                    fetch(apiUrl(`/api/finance/chart-data?range=${range}`), { headers: authHeader() }),
                    fetch(apiUrl('/api/finance/category-breakdown'), { headers: authHeader() }),
                    fetch(apiUrl('/api/finance/summary'), { headers: authHeader() }),
                ]);
                if (chartRes.ok) setChartData(await chartRes.json());
                if (catRes.ok) setCategoryData(await catRes.json());
                if (sumRes.ok) setSummary(await sumRes.json());
            } catch (e) {
                console.error('Analytics fetch error', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [range]);

    const totalSpent = summary.totalExpense;
    const topCategory = categoryData.length > 0 ? categoryData[0] : null;
    const topPct = topCategory && totalSpent > 0 ? Math.round((topCategory.value / totalSpent) * 100) : 0;

    // Merge chart data into a spending-only view for the line chart
    const spendingData = chartData.map(d => ({ name: d.name, amount: d.expenses || 0 }));

    return (
        <div className="page-container analytics-page">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Deep dive into your financial data and spending patterns.</p>
            </header>

            <div className="analytics-grid">
                {/* Spending Trend Chart */}
                <Card className="chart-card">
                    <div className="chart-header">
                        <h3>Spending Over Time</h3>
                        <select className="chart-select" value={range} onChange={e => setRange(e.target.value)}>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="6months">Last 6 Months</option>
                        </select>
                    </div>
                    <div className="chart-container" style={{ height: 300 }}>
                        {spendingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={spendingData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3b46" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#2a2b36', border: '1px solid #3a3b46', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#1e1f29' }} activeDot={{ r: 6, fill: '#6366f1' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                                {loading ? 'Loading...' : 'No spending data for this period'}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Category Breakdown */}
                <Card className="chart-card">
                    <div className="chart-header"><h3>Expenses by Category</h3></div>
                    <div className="chart-container" style={{ height: 300 }}>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#2a2b36', border: '1px solid #3a3b46', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} formatter={v => `$${v}`} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                                {loading ? 'Loading...' : 'No expense data yet'}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Summary Stats */}
                <div className="analytics-summary-grid">
                    <Card className="summary-card">
                        <h4>Total Spent</h4>
                        <div className="amount">${loading ? '...' : totalSpent.toFixed(2)}</div>
                    </Card>
                    <Card className="summary-card">
                        <h4>Total Income</h4>
                        <div className="amount">${loading ? '...' : summary.totalIncome.toFixed(2)}</div>
                    </Card>
                    <Card className="summary-card">
                        <h4>Top Category</h4>
                        <div className="amount">{topCategory ? topCategory.name : '—'}</div>
                        <div className="trend text-secondary">{topCategory ? `${topPct}% of total expenses` : 'No data'}</div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

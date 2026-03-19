import React, { useState, useEffect } from 'react';
import { apiUrl, authHeader } from '../utils/api';
import { Card } from '../components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import './Dashboard.css';

const COLORS = ['#6366f1', '#12B76A', '#F59E0B', '#EF4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function Dashboard() {
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, totalInvestment: 0, balance: 0 });
    const [chartData, setChartData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const headers = authHeader();
                const dashboardRes = await fetch(apiUrl('/api/finance/dashboard?range=week'), { headers });
                if (dashboardRes.ok) {
                    const payload = await dashboardRes.json();
                    setSummary(payload.summary || { totalIncome: 0, totalExpense: 0, totalInvestment: 0, balance: 0 });
                    setChartData(payload.chartData || []);
                    setCategoryData(payload.categoryData || []);
                    return;
                }

                const [sumRes, chartRes, catRes] = await Promise.all([
                    fetch(apiUrl('/api/finance/summary'), { headers }),
                    fetch(apiUrl('/api/finance/chart-data?range=week'), { headers }),
                    fetch(apiUrl('/api/finance/category-breakdown'), { headers }),
                ]);
                if (sumRes.ok) setSummary(await sumRes.json());
                if (chartRes.ok) setChartData(await chartRes.json());
                if (catRes.ok) setCategoryData(await catRes.json());
            } catch (e) {
                console.error('Dashboard fetch error', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const healthScore = summary.totalIncome > 0
        ? Math.min(100, Math.round(((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100))
        : 0;
    const healthLabel = healthScore >= 75 ? 'Excellent' : healthScore >= 50 ? 'Good' : healthScore >= 25 ? 'Fair' : 'Needs Work';

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div>
                    <h1>Financial Overview</h1>
                    <p className="subtitle">Welcome back! Here's your financial summary.</p>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <Card hover>
                    <div className="kpi-header">
                        <span className="kpi-title">Total Balance</span>
                        <div className="icon-wrapper accent"><TrendingUp size={20} /></div>
                    </div>
                    <div className="kpi-value">${loading ? '...' : summary.balance.toFixed(2)}</div>
                    <div className="kpi-trend positive">
                        <ArrowUpRight size={16} />
                        <span>Live data</span>
                    </div>
                </Card>

                <Card hover>
                    <div className="kpi-header">
                        <span className="kpi-title">Total Income</span>
                        <div className="icon-wrapper income"><TrendingUp size={20} /></div>
                    </div>
                    <div className="kpi-value">${loading ? '...' : summary.totalIncome.toFixed(2)}</div>
                    <div className="kpi-trend positive">
                        <ArrowUpRight size={16} /> <span>Live data</span>
                    </div>
                </Card>

                <Card hover>
                    <div className="kpi-header">
                        <span className="kpi-title">Total Expenses</span>
                        <div className="icon-wrapper expense"><TrendingDown size={20} /></div>
                    </div>
                    <div className="kpi-value">${loading ? '...' : summary.totalExpense.toFixed(2)}</div>
                    <div className="kpi-trend negative">
                        <ArrowDownRight size={16} /> <span>Live data</span>
                    </div>
                </Card>

                <Card hover className="health-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Financial Health</span>
                        <Activity className="health-icon" size={24} />
                    </div>
                    <div className="health-score">
                        <span className="score-value">{loading ? '...' : healthScore}</span>
                        <span className="score-max">/100</span>
                    </div>
                    <div className="health-status">{healthLabel}</div>
                </Card>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <Card className="chart-card main-chart">
                    <h3>Income vs Expenses</h3>
                    <div className="chart-container">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#12B76A" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#12B76A" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: 'none', borderRadius: '8px', boxShadow: 'var(--shadow-soft)' }} itemStyle={{ color: 'var(--color-text-primary)' }} />
                                    <Area type="monotone" dataKey="income" stroke="#12B76A" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                                {loading ? 'Loading chart...' : 'Add transactions to see chart data'}
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="chart-card side-chart">
                    <h3>Expense by Category</h3>
                    <div className="chart-container">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: 'none', borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                                {loading ? 'Loading...' : 'No expense data yet'}
                            </div>
                        )}
                    </div>
                    <div className="legend">
                        {categoryData.map((item, index) => (
                            <div key={item.name} className="legend-item">
                                <span className="dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                <span className="legend-name">{item.name}</span>
                                <span className="legend-val">${item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function TrendingDown({ size }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
}

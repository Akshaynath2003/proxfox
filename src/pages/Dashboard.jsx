import React from 'react';
import { Card } from '../components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import './Dashboard.css';

const EXPENSE_DATA = [
    { name: 'Mon', income: 4000, expenses: 2400 },
    { name: 'Tue', income: 3000, expenses: 1398 },
    { name: 'Wed', income: 2000, expenses: 3800 },
    { name: 'Thu', income: 2780, expenses: 3908 },
    { name: 'Fri', income: 1890, expenses: 4800 },
    { name: 'Sat', income: 2390, expenses: 3800 },
    { name: 'Sun', income: 3490, expenses: 4300 },
];

const CATEGORY_DATA = [
    { name: 'Housing', value: 400 },
    { name: 'Food', value: 300 },
    { name: 'Transport', value: 300 },
    { name: 'Entertainment', value: 200 },
];
const COLORS = ['#1E90FF', '#12B76A', '#F59E0B', '#EF4444'];

export function Dashboard() {
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
                        <WalletIcon />
                    </div>
                    <div className="kpi-value">$24,562.00</div>
                    <div className="kpi-trend positive">
                        <ArrowUpRight size={16} />
                        <span>+2.4% from last month</span>
                    </div>
                </Card>

                <Card hover>
                    <div className="kpi-header">
                        <span className="kpi-title">Monthly Income</span>
                        <div className="icon-wrapper income"><TrendingUp size={20} /></div>
                    </div>
                    <div className="kpi-value">$8,240.00</div>
                    <div className="kpi-trend positive">
                        <ArrowUpRight size={16} />
                        <span>+5.1% from last month</span>
                    </div>
                </Card>

                <Card hover>
                    <div className="kpi-header">
                        <span className="kpi-title">Monthly Expenses</span>
                        <div className="icon-wrapper expense"><TrendingDown size={20} /></div>
                    </div>
                    <div className="kpi-value">$3,420.00</div>
                    <div className="kpi-trend negative">
                        <ArrowDownRight size={16} />
                        <span>-1.2% from last month</span>
                    </div>
                </Card>

                <Card hover className="health-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Financial Health</span>
                        <Activity className="health-icon" size={24} />
                    </div>
                    <div className="health-score">
                        <span className="score-value">85</span>
                        <span className="score-max">/100</span>
                    </div>
                    <div className="health-status">Excellent</div>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                <Card className="chart-card main-chart">
                    <h3>Income vs Expenses</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={EXPENSE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-card)', border: 'none', borderRadius: '8px', boxShadow: 'var(--shadow-soft)' }}
                                    itemStyle={{ color: 'var(--color-text-primary)' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#12B76A" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="chart-card side-chart">
                    <h3>Expense by Category</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={CATEGORY_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {CATEGORY_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-card)', border: 'none', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="legend">
                        {CATEGORY_DATA.map((item, index) => (
                            <div key={item.name} className="legend-item">
                                <span className="dot" style={{ backgroundColor: COLORS[index] }}></span>
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

// Simple icons mapped
function WalletIcon() {
    return <div className="icon-wrapper accent"><TrendingUp size={20} /></div>; // using TrendingUp as placeholder for styling wrapper
}
function TrendingDown({ size }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
}

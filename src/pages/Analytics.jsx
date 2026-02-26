import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import './Analytics.css';

const SPENDING_DATA = [
    { name: 'Mon', amount: 120 },
    { name: 'Tue', amount: 350 },
    { name: 'Wed', amount: 200 },
    { name: 'Thu', amount: 480 },
    { name: 'Fri', amount: 300 },
    { name: 'Sat', amount: 850 },
    { name: 'Sun', amount: 150 },
];

const CATEGORY_DATA = [
    { name: 'Housing', value: 1200 },
    { name: 'Food', value: 600 },
    { name: 'Transport', value: 300 },
    { name: 'Entertainment', value: 250 },
    { name: 'Shopping', value: 400 },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Analytics() {
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
                        <select className="chart-select">
                            <option>This Week</option>
                            <option>This Month</option>
                            <option>This Year</option>
                        </select>
                    </div>
                    <div className="chart-container" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={SPENDING_DATA}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3a3b46" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#2a2b36', border: '1px solid #3a3b46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#1e1f29' }}
                                    activeDot={{ r: 6, fill: '#6366f1' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Category Breakdown Chart */}
                <Card className="chart-card">
                    <div className="chart-header">
                        <h3>Expenses by Category</h3>
                    </div>
                    <div className="chart-container" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={CATEGORY_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {CATEGORY_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#2a2b36', border: '1px solid #3a3b46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => `$${value}`}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Summary Stats */}
                <div className="analytics-summary-grid">
                    <Card className="summary-card">
                        <h4>Total Spent</h4>
                        <div className="amount">$2,750.00</div>
                        <div className="trend positive">↓ 12% vs last month</div>
                    </Card>
                    <Card className="summary-card">
                        <h4>Daily Average</h4>
                        <div className="amount">$91.66</div>
                        <div className="trend negative">↑ 5% vs last week</div>
                    </Card>
                    <Card className="summary-card">
                        <h4>Top Category</h4>
                        <div className="amount">Housing</div>
                        <div className="trend text-secondary">43% of total expenses</div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

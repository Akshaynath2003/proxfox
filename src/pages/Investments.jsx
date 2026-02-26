import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import './Investments.css';

const PORTFOLIO_DATA = [
    { name: 'Jan', value: 45000 },
    { name: 'Feb', value: 47500 },
    { name: 'Mar', value: 46200 },
    { name: 'Apr', value: 49800 },
    { name: 'May', value: 52400 },
    { name: 'Jun', value: 51200 },
    { name: 'Jul', value: 55600 },
];

const HOLDINGS = [
    { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 45, price: 178.25, change: 2.4, value: 8021.25 },
    { id: 2, symbol: 'MSFT', name: 'Microsoft Corp.', shares: 32, price: 335.10, change: 1.2, value: 10723.20 },
    { id: 3, symbol: 'BTC', name: 'Bitcoin', shares: 0.25, price: 34500.00, change: -4.5, value: 8625.00 },
    { id: 4, symbol: 'VOO', name: 'Vanguard S&P 500', shares: 60, price: 410.50, change: 0.8, value: 24630.00 },
];

export function Investments() {
    const totalValue = HOLDINGS.reduce((sum, h) => sum + h.value, 0);

    return (
        <div className="page-container investments-page">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Investments</h1>
                <p className="page-subtitle">Track and grow your investment portfolio over time.</p>
            </header>

            <div className="portfolio-summary">
                <Card className="portfolio-value-card">
                    <div className="portfolio-header">
                        <div className="portfolio-icon">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="portfolio-label">Total Portfolio Value</p>
                            <h2 className="portfolio-total">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                    <div className="portfolio-trend positive">
                        <TrendingUp size={20} />
                        <span>+$2,450.00 (4.5%) This Month</span>
                    </div>
                </Card>
            </div>

            <Card className="chart-card">
                <div className="chart-header">
                    <h3>Performance History</h3>
                    <div className="chart-tabs">
                        <button className="tab active">1M</button>
                        <button className="tab">3M</button>
                        <button className="tab">YTD</button>
                        <button className="tab">1Y</button>
                        <button className="tab">ALL</button>
                    </div>
                </div>
                <div className="chart-container" style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={PORTFOLIO_DATA}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#3a3b46" vertical={false} />
                            <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                            <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `$${value / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#2a2b36', border: '1px solid #3a3b46', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="holdings-section">
                <h3 className="section-title">Your Assets</h3>
                <Card className="holdings-card">
                    <div className="table-responsive">
                        <table className="holdings-table">
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Holdings</th>
                                    <th className="text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {HOLDINGS.map((asset) => (
                                    <tr key={asset.id}>
                                        <td>
                                            <div className="asset-info">
                                                <div className="asset-symbol">{asset.symbol}</div>
                                                <div className="asset-name">{asset.name}</div>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="asset-price">${asset.price.toFixed(2)}</div>
                                            <div className={`asset-change ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                                                {asset.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {Math.abs(asset.change)}%
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="asset-shares">{asset.shares} shares</div>
                                        </td>
                                        <td className="text-right">
                                            <div className="asset-total-value">${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

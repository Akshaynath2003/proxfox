import React, { useState } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import './Transactions.css';

const MOCK_TRANSACTIONS = [
    { id: 1, date: '2023-10-24', description: 'Apple Store', category: 'Electronics', type: 'expense', amount: 999.00, status: 'Completed' },
    { id: 2, date: '2023-10-23', description: 'Monthly Salary', category: 'Income', type: 'income', amount: 4500.00, status: 'Completed' },
    { id: 3, date: '2023-10-22', description: 'Uber Rides', category: 'Transport', type: 'expense', amount: 24.50, status: 'Completed' },
    { id: 4, date: '2023-10-21', description: 'Whole Foods Market', category: 'Groceries', type: 'expense', amount: 142.30, status: 'Completed' },
    { id: 5, date: '2023-10-20', description: 'Netflix Subscription', category: 'Entertainment', type: 'expense', amount: 15.99, status: 'Completed' },
    { id: 6, date: '2023-10-19', description: 'Freelance Design', category: 'Income', type: 'income', amount: 850.00, status: 'Pending' },
    { id: 7, date: '2023-10-18', description: 'Amazon.com', category: 'Shopping', type: 'expense', amount: 64.20, status: 'Completed' },
    { id: 8, date: '2023-10-15', description: 'Gym Membership', category: 'Health', type: 'expense', amount: 49.99, status: 'Completed' },
];

export function Transactions() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = MOCK_TRANSACTIONS.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container transactions-page">
            <header className="page-header flex-between">
                <div>
                    <h1 className="page-title">Transactions</h1>
                    <p className="page-subtitle">View and manage your recent transactions.</p>
                </div>
                <button className="btn-secondary">
                    <Download size={18} />
                    <span>Export CSV</span>
                </button>
            </header>

            <Card className="transactions-card">
                <div className="transactions-toolbar">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <button className="btn-filter">
                        <Filter size={18} />
                        <span>Filter</span>
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="transactions-table">
                        <thead>
                            <tr>
                                <th>Transaction</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th className="text-right">Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id}>
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
                                    <td>
                                        <span className={`tx-status status-${tx.status.toLowerCase()}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <span className={`tx-amount ${tx.type}`}>
                                            {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <button className="btn-icon">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center empty-state">
                                        No transactions found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

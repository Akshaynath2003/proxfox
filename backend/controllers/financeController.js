import Transaction from '../models/Transaction.js';

// @desc    Get user transactions
// @route   GET /api/finance/transactions
// @access  Private
export const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a transaction
// @route   POST /api/finance/transactions
// @access  Private
export const addTransaction = async (req, res) => {
    try {
        const { amount, type, category, description, date } = req.body;

        const transaction = await Transaction.create({
            user: req.user._id,
            amount,
            type,
            category,
            description,
            date: date || Date.now(),
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user financial summary
// @route   GET /api/finance/summary
// @access  Private
export const getFinanceSummary = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id });

        let totalIncome = 0;
        let totalExpense = 0;
        let totalInvestment = 0;

        transactions.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
            if (t.type === 'investment') totalInvestment += t.amount;
        });

        res.json({
            totalIncome,
            totalExpense,
            totalInvestment,
            balance: totalIncome - totalExpense - totalInvestment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

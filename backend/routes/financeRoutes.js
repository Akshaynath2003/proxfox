import express from 'express';
import { getTransactions, addTransaction, getFinanceSummary } from '../controllers/financeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/transactions')
    .get(getTransactions)
    .post(addTransaction);

router.route('/summary').get(getFinanceSummary);

export default router;

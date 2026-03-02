import express from 'express';
import { getUsers, updateUserStatus, getPlatformStats } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes here are protected and require admin or higher privileges
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.route('/users').get(getUsers);
router.route('/user/:id/status').put(updateUserStatus);
router.route('/stats').get(getPlatformStats);

export default router;

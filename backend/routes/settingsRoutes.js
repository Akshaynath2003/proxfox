import express from 'express';
import { getSettings, updateSetting, createSetting } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.route('/')
    .get(getSettings)
    .post(createSetting);

router.route('/:id').put(updateSetting);

export default router;

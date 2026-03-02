import SystemSettings from '../models/SystemSettings.js';

// @desc    Get all system settings
// @route   GET /api/settings
// @access  Private/Admin
export const getSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.find({});
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a system setting
// @route   PUT /api/settings/:id
// @access  Private/Admin
export const updateSetting = async (req, res) => {
    try {
        const { ruleValue, description } = req.body;
        const setting = await SystemSettings.findById(req.params.id);

        if (setting) {
            setting.ruleValue = ruleValue !== undefined ? ruleValue : setting.ruleValue;
            setting.description = description || setting.description;
            setting.updatedBy = req.user._id;

            const updatedSetting = await setting.save();
            res.json(updatedSetting);
        } else {
            res.status(404).json({ message: 'Setting not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a system setting
// @route   POST /api/settings
// @access  Private/Admin
export const createSetting = async (req, res) => {
    try {
        const { ruleName, ruleValue, description } = req.body;

        const settingExists = await SystemSettings.findOne({ ruleName });

        if (settingExists) {
            return res.status(400).json({ message: 'Setting already exists' });
        }

        const setting = await SystemSettings.create({
            ruleName,
            ruleValue,
            description,
            updatedBy: req.user._id
        });

        res.status(201).json(setting);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

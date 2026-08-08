import { prisma } from '../config/db.js';
export const getTemplates = async (req, res) => {
    try {
        const templates = await prisma.template.findMany();
        return res.json({ success: true, data: templates });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

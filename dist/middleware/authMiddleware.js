import jwt from 'jsonwebtoken';
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key-replace-this');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Token is expired or invalid' });
    }
};

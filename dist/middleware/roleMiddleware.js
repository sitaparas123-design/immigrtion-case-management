const getRequiredPermission = (method, path, baseUrl) => {
    const fullPath = (baseUrl + path).toLowerCase();
    if (fullPath.includes('/clients')) {
        if (method === 'POST')
            return 'create_client';
        if (method === 'GET')
            return 'view_clients';
        if (method === 'PUT')
            return 'edit_client';
        if (method === 'DELETE')
            return 'delete_client';
    }
    if (fullPath.includes('/cases')) {
        if (method === 'POST')
            return 'case.create';
        if (method === 'GET')
            return 'case.view';
        if (method === 'PATCH')
            return 'case.view';
    }
    return null;
};
export const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
        }
        const userRole = req.user.role;
        const userPermissions = (req.user.permissions || []).map(p => p.toLowerCase());
        const requiredPermission = getRequiredPermission(req.method, req.path, req.baseUrl);
        // Logging internal debug details (as requested by Requirement 7)
        console.log(`[AUTH DEBUG] Request URL: ${req.method} ${req.baseUrl}${req.path}`);
        console.log(`[AUTH DEBUG] Current Role: ${userRole}`);
        console.log(`[AUTH DEBUG] Current Permissions: ${JSON.stringify(req.user.permissions || [])}`);
        console.log(`[AUTH DEBUG] Required Permission: ${requiredPermission}`);
        let authorized = allowedRoles.includes(userRole);
        if (!authorized && requiredPermission) {
            authorized = userPermissions.includes(requiredPermission.toLowerCase());
        }
        // Super Administrator bypasses lower-role permission restrictions where intended
        if (userRole.toLowerCase() === 'superadmin') {
            authorized = true;
        }
        console.log(`[AUTH DEBUG] Authorization Decision: ${authorized ? 'ALLOWED' : 'DENIED'}`);
        res.on('finish', () => {
            console.log(`[AUTH DEBUG] API Response Code: ${res.statusCode}`);
        });
        if (!authorized) {
            return res.status(403).json({ success: false, error: 'Forbidden: You do not have permissions for this action' });
        }
        next();
    };
};

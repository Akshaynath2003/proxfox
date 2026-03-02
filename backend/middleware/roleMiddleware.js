// Role-Based Access Control (RBAC) middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                message: `User role ${req.user ? req.user.role : 'Guest'} is not authorized to access this route`
            });
            return;
        }
        next();
    };
};

export { authorize };

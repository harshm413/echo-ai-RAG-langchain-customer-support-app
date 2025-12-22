import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user and organization
    const user = await User.findById(decoded.userId);
    const organization = await Organization.findById(decoded.organizationId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    if (!organization || !organization.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive organization' });
    }

    req.user = {
      userId: user._id,
      organizationId: organization._id,
      role: user.role,
      email: user.email,
      name: user.name
    };

    req.organization = organization;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireSubscription = (feature) => {
  return (req, res, next) => {
    if (!req.organization) {
      return res.status(401).json({ error: 'Organization required' });
    }

    const subscription = req.organization.subscription;
    
    if (subscription.status !== 'active') {
      return res.status(403).json({ error: 'Active subscription required' });
    }

    if (feature && !subscription.features[feature]) {
      return res.status(403).json({ 
        error: `Feature '${feature}' not available in current plan` 
      });
    }

    next();
  };
};
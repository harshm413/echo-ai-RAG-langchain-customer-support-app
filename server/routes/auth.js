import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user and organization
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, organizationName, domain } = req.body;

    // Validate input
    if (!name || !email || !password || !organizationName || !domain) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists with this email' 
      });
    }

    // Check if organization domain already exists
    const existingOrg = await Organization.findOne({ domain });
    if (existingOrg) {
      return res.status(400).json({ 
        error: 'Organization with this domain already exists' 
      });
    }

    // Create organization first
    const organization = new Organization({
      name: organizationName,
      domain: domain.toLowerCase()
    });
    await organization.save();

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      organizationId: organization._id,
      role: 'admin' // First user is admin
    });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        organizationId: organization._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id
      },
      organization: {
        id: organization._id,
        name: organization.name,
        domain: organization.domain,
        subscription: organization.subscription
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user and populate organization
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('organizationId');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        organizationId: user.organizationId._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId._id,
        lastLogin: user.lastLogin
      },
      organization: {
        id: user.organizationId._id,
        name: user.organizationId.name,
        domain: user.organizationId.domain,
        subscription: user.organizationId.subscription
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('organizationId')
      .select('-password');

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId._id,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      },
      organization: {
        id: user.organizationId._id,
        name: user.organizationId.name,
        domain: user.organizationId.domain,
        subscription: user.organizationId.subscription,
        settings: user.organizationId.settings
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid user' 
      });
    }

    // Generate new token
    const token = jwt.sign(
      { 
        userId: user._id, 
        organizationId: user.organizationId,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

export default router;
import express from 'express';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get current organization
router.get('/current', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization
router.put('/current', requireRole(['admin']), async (req, res) => {
  try {
    const { name, domain } = req.body;

    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (name) organization.name = name;
    if (domain) organization.domain = domain.toLowerCase();

    await organization.save();

    res.json(organization);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization settings
router.get('/settings', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization.settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization settings
router.put('/settings', requireRole(['admin']), async (req, res) => {
  try {
    const { widget, ai, notifications } = req.body;

    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (widget) {
      organization.settings.widget = { ...organization.settings.widget, ...widget };
    }
    
    if (ai) {
      organization.settings.ai = { ...organization.settings.ai, ...ai };
    }
    
    if (notifications) {
      organization.settings.notifications = { ...organization.settings.notifications, ...notifications };
    }

    await organization.save();

    res.json(organization.settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization users
router.get('/users', requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({ 
      organizationId: req.user.organizationId 
    }).select('-password');

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite user to organization
router.post('/users/invite', requireRole(['admin']), async (req, res) => {
  try {
    const { email, name, role = 'operator' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // In a real implementation, you would send an invitation email
    // For now, we'll create a user with a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    
    const user = new User({
      email: email.toLowerCase(),
      name,
      password: tempPassword,
      role,
      organizationId: req.user.organizationId,
      isActive: false // User needs to activate account
    });

    await user.save();

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      },
      tempPassword // In production, this would be sent via email
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role
router.patch('/users/:userId/role', requireRole(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    const user = await User.findOne({
      _id: userId,
      organizationId: req.user.organizationId
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get widget configuration
router.get('/widget-config', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = organization.settings?.widget || {
      primaryColor: '#3B82F6',
      welcomeMessage: 'Hi! How can I help you today?',
      position: 'bottom-right',
      showAvatar: true,
      collectEmail: true,
      collectName: true,
      enableVoice: false,
      workingHours: {
        enabled: false,
        timezone: 'UTC',
        schedule: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      }
    };

    res.json({ config });
  } catch (error) {
    console.error('Get widget config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update widget configuration
router.put('/widget-config', requireRole(['admin']), async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.settings) {
      organization.settings = {};
    }

    organization.settings.widget = {
      ...organization.settings.widget,
      ...req.body
    };

    await organization.save();

    res.json({ 
      message: 'Widget configuration updated successfully',
      config: organization.settings.widget 
    });
  } catch (error) {
    console.error('Update widget config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
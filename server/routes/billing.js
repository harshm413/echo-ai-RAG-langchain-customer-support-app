import express from 'express';
import BillingService from '../services/billingService.js';
import Organization from '../models/Organization.js';

const router = express.Router();
const billingService = new BillingService();

// Get current subscription
router.get('/subscription', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const currentPlan = billingService.getPlan(organization.subscription?.planId || 'free');
    
    res.json({
      subscription: organization.subscription,
      plan: currentPlan,
      usage: organization.usage
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = billingService.getAllPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create subscription
router.post('/subscription', async (req, res) => {
  try {
    const { planId } = req.body;
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Create or get Stripe customer
    let customerId = organization.billing?.customerId;
    if (!customerId) {
      const customer = await billingService.createCustomer(
        organization._id,
        req.user.email,
        organization.name
      );
      customerId = customer?.id;
      
      if (customerId) {
        organization.billing = {
          ...organization.billing,
          customerId,
          email: req.user.email
        };
      }
    }

    // Create subscription
    const subscription = await billingService.createSubscription(
      organization._id,
      planId,
      customerId
    );

    // Update organization
    organization.subscription = subscription;
    await organization.save();

    res.json({
      subscription,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update subscription
router.put('/subscription', async (req, res) => {
  try {
    const { planId } = req.body;
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.subscription?.id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const updatedSubscription = await billingService.updateSubscription(
      organization.subscription.id,
      planId
    );

    organization.subscription = updatedSubscription;
    await organization.save();

    res.json({
      subscription: updatedSubscription,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Cancel subscription
router.delete('/subscription', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.subscription?.id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const canceledSubscription = await billingService.cancelSubscription(
      organization.subscription.id
    );

    organization.subscription = {
      ...organization.subscription,
      ...canceledSubscription
    };
    await organization.save();

    res.json({
      subscription: organization.subscription,
      message: 'Subscription canceled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create payment intent
router.post('/payment-intent', async (req, res) => {
  try {
    const { amount, planId } = req.body;
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const customerId = organization.billing?.customerId;
    if (!customerId) {
      return res.status(400).json({ error: 'No customer ID found' });
    }

    const paymentIntent = await billingService.createPaymentIntent(
      amount,
      'usd',
      customerId
    );

    res.json(paymentIntent);
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update billing information
router.put('/billing', async (req, res) => {
  try {
    const { email, address, taxId } = req.body;
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    organization.billing = {
      ...organization.billing,
      email,
      address,
      taxId
    };

    await organization.save();

    res.json({
      billing: organization.billing,
      message: 'Billing information updated successfully'
    });
  } catch (error) {
    console.error('Update billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get usage statistics
router.get('/usage', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Calculate current usage
    const { default: Conversation } = await import('../models/Conversation.js');
    const { default: User } = await import('../models/User.js');
    const { default: KnowledgeBase } = await import('../models/KnowledgeBase.js');

    const [conversationCount, teamMemberCount, documentCount] = await Promise.all([
      Conversation.countDocuments({ organizationId: req.user.organizationId }),
      User.countDocuments({ organizationId: req.user.organizationId, isActive: true }),
      KnowledgeBase.countDocuments({ organizationId: req.user.organizationId, isActive: true })
    ]);

    const usage = {
      conversations: {
        current: conversationCount,
        limit: organization.subscription?.features?.maxConversations || 100
      },
      teamMembers: {
        current: teamMemberCount,
        limit: organization.subscription?.features?.maxTeamMembers || 1
      },
      knowledgeBase: {
        documents: documentCount,
        storage: organization.usage?.knowledgeBase?.storage || 0
      }
    };

    res.json({ usage });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.warn('Stripe webhook secret not configured');
      return res.status(200).send('OK');
    }

    let event;
    try {
      event = billingService.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await billingService.handleWebhook(event);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
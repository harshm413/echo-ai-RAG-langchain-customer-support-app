import Stripe from 'stripe';
import winston from 'winston';
import Organization from '../models/Organization.js';
import User from '../models/User.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class BillingService {
  constructor() {
    this.stripe = process.env.STRIPE_SECRET_KEY ? 
      new Stripe(process.env.STRIPE_SECRET_KEY) : null;
    
    this.plans = {
      free: {
        id: 'free',
        name: 'Free Plan',
        price: 0,
        features: {
          maxTeamMembers: 1,
          maxConversations: 100,
          aiSupport: false,
          voiceAgents: false,
          knowledgeBase: false,
          analytics: false,
          customization: false
        }
      },
      starter: {
        id: 'starter',
        name: 'Starter Plan',
        price: 29,
        stripePriceId: 'price_starter_monthly',
        features: {
          maxTeamMembers: 3,
          maxConversations: 1000,
          aiSupport: true,
          voiceAgents: false,
          knowledgeBase: true,
          analytics: true,
          customization: false
        }
      },
      professional: {
        id: 'professional',
        name: 'Professional Plan',
        price: 99,
        stripePriceId: 'price_professional_monthly',
        features: {
          maxTeamMembers: 10,
          maxConversations: 10000,
          aiSupport: true,
          voiceAgents: true,
          knowledgeBase: true,
          analytics: true,
          customization: true
        }
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise Plan',
        price: 299,
        stripePriceId: 'price_enterprise_monthly',
        features: {
          maxTeamMembers: -1, // unlimited
          maxConversations: -1, // unlimited
          aiSupport: true,
          voiceAgents: true,
          knowledgeBase: true,
          analytics: true,
          customization: true
        }
      }
    };
  }

  async createCustomer(organizationId, email, name) {
    if (!this.stripe) {
      logger.warn('Stripe not configured, skipping customer creation');
      return null;
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId: organizationId.toString()
        }
      });

      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw error;
    }
  }

  async createSubscription(organizationId, planId, customerId) {
    if (!this.stripe) {
      logger.warn('Stripe not configured, creating mock subscription');
      return this.createMockSubscription(planId);
    }

    try {
      const plan = this.plans[planId];
      if (!plan || !plan.stripePriceId) {
        throw new Error('Invalid plan');
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        metadata: {
          organizationId: organizationId.toString(),
          planId
        }
      });

      return {
        id: subscription.id,
        status: subscription.status,
        planId,
        features: plan.features,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  createMockSubscription(planId) {
    const plan = this.plans[planId] || this.plans.free;
    return {
      id: `mock_sub_${Date.now()}`,
      status: 'active',
      planId,
      features: plan.features,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false
    };
  }

  async updateSubscription(subscriptionId, newPlanId) {
    if (!this.stripe) {
      logger.warn('Stripe not configured, updating mock subscription');
      return this.createMockSubscription(newPlanId);
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const plan = this.plans[newPlanId];

      if (!plan || !plan.stripePriceId) {
        throw new Error('Invalid plan');
      }

      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: plan.stripePriceId
        }],
        metadata: {
          ...subscription.metadata,
          planId: newPlanId
        }
      });

      return {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        planId: newPlanId,
        features: plan.features,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
      };
    } catch (error) {
      logger.error('Failed to update subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId) {
    if (!this.stripe) {
      logger.warn('Stripe not configured, canceling mock subscription');
      return { status: 'canceled' };
    }

    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });

      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount, currency = 'usd', customerId) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true
        }
      });

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      };
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  async handleWebhook(event) {
    if (!this.stripe) {
      logger.warn('Stripe not configured, ignoring webhook');
      return;
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Webhook handling error:', error);
      throw error;
    }
  }

  async handleSubscriptionUpdate(subscription) {
    const organizationId = subscription.metadata.organizationId;
    const planId = subscription.metadata.planId;

    if (!organizationId || !planId) {
      logger.error('Missing metadata in subscription webhook');
      return;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      logger.error(`Organization not found: ${organizationId}`);
      return;
    }

    const plan = this.plans[planId];
    if (!plan) {
      logger.error(`Plan not found: ${planId}`);
      return;
    }

    organization.subscription = {
      id: subscription.id,
      status: subscription.status,
      planId,
      features: plan.features,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };

    await organization.save();
    logger.info(`Updated subscription for organization ${organizationId}`);
  }

  async handleSubscriptionCanceled(subscription) {
    const organizationId = subscription.metadata.organizationId;

    if (!organizationId) {
      logger.error('Missing organizationId in subscription webhook');
      return;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      logger.error(`Organization not found: ${organizationId}`);
      return;
    }

    // Downgrade to free plan
    organization.subscription = {
      id: null,
      status: 'canceled',
      planId: 'free',
      features: this.plans.free.features,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false
    };

    await organization.save();
    logger.info(`Downgraded organization ${organizationId} to free plan`);
  }

  async handlePaymentSucceeded(invoice) {
    logger.info(`Payment succeeded for invoice ${invoice.id}`);
    // Additional logic for successful payments
  }

  async handlePaymentFailed(invoice) {
    logger.error(`Payment failed for invoice ${invoice.id}`);
    // Additional logic for failed payments (notifications, etc.)
  }

  getPlan(planId) {
    return this.plans[planId] || this.plans.free;
  }

  getAllPlans() {
    return Object.values(this.plans);
  }

  canAccessFeature(organization, feature) {
    if (!organization.subscription || !organization.subscription.features) {
      return this.plans.free.features[feature] || false;
    }

    return organization.subscription.features[feature] || false;
  }

  isWithinLimits(organization, metric, currentCount) {
    if (!organization.subscription || !organization.subscription.features) {
      const limit = this.plans.free.features[metric];
      return limit === -1 || currentCount < limit;
    }

    const limit = organization.subscription.features[metric];
    return limit === -1 || currentCount < limit;
  }
}

export default BillingService;
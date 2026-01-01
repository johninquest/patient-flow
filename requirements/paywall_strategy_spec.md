# Paywall & Monetization Strategy

## Overview
Lanlod operates on an **owner-pays model** where property owners subscribe to use the platform, while managers and viewers access shared properties at no cost.

## Why This Approach?

**Decision Context:**
We chose the owner-pays model after considering the access control design and real-world property management dynamics:

1. **Natural Business Relationship**: Property owners are the customers who benefit economically from better management - they should pay
2. **Removes Friction from Sharing**: Managers and viewers never worry about licensing costs, making delegation seamless
3. **Aligned with Access Control**: Since "every Google sign-in = potential property owner," billing follows ownership naturally
4. **Simple to Explain**: "Pay for properties you own, not for people who help you" is immediately clear
5. **Scales Fairly**: Small landlords (1 property) pay little; large portfolios pay more - directly tied to value received
6. **Competitive Advantage**: Many property management tools charge per user/seat, making team collaboration expensive

**Why Property-Based Over Unit-Based:**
- Easier to understand ("I have 4 properties" vs counting units)
- More predictable pricing as portfolios grow
- Simpler mental model for mixed portfolios (some properties have 2 units, others have 20)
- Can always pivot to unit-based if data shows it's better

**Why 6-12 Month Free Trial:**
- Property management is a commitment - need time to migrate data and build trust
- Landlords are cautious with tools that touch their finances
- Long trial period creates real dependency and demonstrates value
- Gives us time to improve product based on feedback before asking for money

**What This Means for Access Control Integration:**
- Sharing remains free and unlimited (no per-seat costs)
- Managers/viewers never see billing prompts
- Multi-role users (own properties + manage for others) have clean separation
- Locked properties don't break the sharing model - just temporarily inaccessible

## Core Principle: Owner-Pays

**Who Pays:**
- Property **owners** pay based on number of properties they own
- Managers and viewers never pay (they're the owner's delegates)

**Why This Model:**
- Owners have the business relationship with Lanlod
- Owners benefit most from property management tools
- Managers/viewers are tools the owner uses (like team seats)
- Simpler billing (one payer per property group)
- Fair: pay for what you own, not what you help with

## Free Trial Period

**Duration:** 6-12 months from sign-up

**What's Included:**
- Unlimited properties
- Unlimited tenants and units
- Unlimited managers/viewers
- All features (no restrictions)

**Trial Experience:**
- Minimal mentions during trial
- Subtle badge: "Trial: 180 days remaining"
- Occasional reminder as trial ends: "Trial ends in 30 days"

**Purpose:**
- Let users build dependence on Lanlod
- Gather feedback and improve product
- Build trust before asking for payment

## Subscription Tiers

### Recommended: Property-Based Pricing

**Free Plan**
- 1 property (all units within it)
- All features
- Unlimited sharing

**Starter - $10/month**
- Up to 3 properties
- All features
- Unlimited sharing

**Growth - $25/month**
- Up to 10 properties
- All features
- Unlimited sharing
- Priority support

**Pro - $50/month**
- Unlimited properties
- All features
- Unlimited sharing
- Priority support
- Advanced analytics (future)

### Alternative: Unit-Based Pricing

**Free Plan**
- Up to 5 rental units (across all properties)
- All features

**Small - $15/month**
- Up to 15 units
- All features

**Medium - $30/month**
- Up to 50 units
- All features

**Large - $60/month**
- Unlimited units
- All features

**Recommendation:** Start with property-based (simpler to understand)

## What Happens When Trial Ends

### For Property Owners

**Scenario: Owner has 4 properties**

They see:
```
Your trial has ended!

You have 4 properties with 18 units in Lanlod.

Continue using Lanlod:
→ Growth Plan ($25/month) - Up to 10 properties ✓
   [Choose This Plan]

Or downgrade to free:
→ Free Plan (1 property)
   [Select which property to keep]

Your data is safe. We'll never delete it.
```

**Options:**
1. **Subscribe**: Choose paid plan, keep all properties
2. **Downgrade**: Select 1 property to keep active on free plan
3. **Do Nothing**: All properties locked (data preserved, no access)

### For Managers/Viewers

**If owner they work for doesn't pay:**
- They lose access to that owner's properties
- They see: "This property is locked. Contact John Smith to restore access."
- Their own properties (if any) follow their own subscription status
- No billing messages (since they don't pay)

**If they also own properties:**
- Their owned properties have separate subscription status
- Dashboard clearly shows which properties are theirs vs shared

## Integration with Access Control

### Multi-Role User Example

**Sarah's Dashboard:**
```
MY PROPERTIES (2) ← Subject to Sarah's billing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 456 Oak Avenue
   Trial: 45 days remaining
   
🏠 789 Pine Street
   Trial: 45 days remaining
   
[+ Add Property]

SHARED WITH ME (2) ← Subject to each owner's billing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 123 Main St
   Manager access • Shared by John Smith
   ✓ Active
   
🏘️ 555 Elm Drive 🔒 LOCKED
   Viewer access • Shared by Maria Garcia
   Maria's subscription ended. Contact them to restore.
```

### Access Rules with Billing

**User can access property if:**
```
(User is owner AND owner has active subscription) 
OR 
(User has manager/viewer access AND property owner has active subscription)
```

**What "active subscription" means:**
- Currently in free trial, OR
- Paid subscription in good standing, OR
- On free plan and property is within limits

## Locked Property Experience

### What Users See
- Property appears in dashboard with 🔒 lock icon
- Click property → "This property is locked"
- Message: "Upgrade your plan to access this property"
- Button: [View Pricing] [Upgrade Now]

### What's Preserved
- All data remains in database (never deleted)
- Can export data before/after locking
- Can unlock instantly by upgrading

### What's Not Available
- Cannot view tenants, units, rent entries, expenses
- Cannot add or edit any data
- Cannot share property with others
- Audit logs still captured (for when unlocked)

## Migration Strategy

### Before Launch (During Trial)
1. Survey users: "Would you pay $X/month for Lanlod?"
2. A/B test pricing page (different tiers)
3. Gather feedback on features users value most
4. Communicate early and often about upcoming paywall

### At Launch
1. **Grandfather existing users**: Extra 30-60 days trial as loyalty reward
2. **Clear announcement**: "Lanlod remains free for managers/viewers"
3. **Offer annual discount**: Pay yearly, get 2 months free (17% off)
4. **Show value**: "You've tracked $X in rent, logged $Y in expenses"

### Communication Example

**Email to John (owner of 4 properties):**
```
Subject: Your Lanlod trial ends in 30 days

Hi John,

You've been using Lanlod to manage 4 properties 
with 18 units. In the last 6 months, you've:

✓ Tracked $67,000 in rent payments
✓ Logged $12,500 in expenses  
✓ Saved 15+ hours on bookkeeping

To keep using Lanlod, choose a plan:

Growth Plan - $25/month
→ Perfect for your 4 properties
→ Your team (Sarah, Tom, Maria) continues free

[Choose Plan] [Compare Plans]

Questions? Just reply to this email.

- The Lanlod Team
```

## Billing Implementation Notes

### Subscription Management
- Use Stripe or similar payment processor
- Support credit card and annual invoicing
- Auto-renewal with email reminders
- Grace period: 7 days after payment fails before locking

### Upgrade/Downgrade
- **Upgrade**: Immediate access, prorated billing
- **Downgrade**: At end of current billing period
- **Cancellation**: Access until end of paid period, then lock

### Property Limit Enforcement
- When user hits limit, show: "Add 1 more property with [Plan Name]"
- Soft limit during grace period (can add, reminded to upgrade)
- Hard limit after grace period (cannot add until upgrade)

### Refund Policy
- 30-day money-back guarantee
- Prorated refunds for annual plans (first 60 days)
- No refunds for partial months

## Metrics to Track

### Conversion Metrics
- Trial → Paid conversion rate
- Which tier do users choose most?
- Time-to-conversion (how many days into trial?)

### Retention Metrics
- Monthly/annual churn rate
- Upgrade rate (Starter → Growth → Pro)
- Downgrade rate and reasons

### Usage Metrics
- Properties per user (median, average)
- Units per user
- Active users (daily/weekly/monthly)
- Feature usage (which features drive retention?)

### Revenue Metrics
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value)

## Future Enhancements

### Pricing Experiments
- Add-ons (SMS reminders, advanced reports)
- Enterprise tier (white-label, API access)
- Volume discounts (50+ properties)

### Billing Features
- Team billing (split cost among multiple owners)
- Property marketplace integration (landlords pay per property sale)
- Affiliate program (property managers refer landlords)

### Free Tier Strategy
- Gradually reduce free tier (1 property → 3 units)
- Keep free tier generous enough for hobbyists
- Use free tier as acquisition channel

## Key Success Factors

**Make Value Clear**
- Show ROI: "You've saved X hours, tracked $Y"
- Testimonials from paying users
- Calculator: "What's 5 hours of your time worth?"

**Reduce Friction**
- One-click upgrade from dashboard
- Try higher tier free for 7 days
- Easy downgrade (no penalties)

**Fair Pricing**
- Research competitor pricing
- Survey willingness to pay
- Keep free tier meaningful (not crippled)

**Build Trust**
- Never delete data (even non-paying users)
- Transparent about what happens when trial ends
- Responsive customer support

**Communicate Openly**
- No surprise billing
- Email reminders before trial ends
- Clear pricing page (no hidden fees)
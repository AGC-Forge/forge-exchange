export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 100,
    period: 'month',
    features: ['100 credit/month', '2 campaign', 'Basic proxy', 'Email support'],
    color: 'slate',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 99_000,
    credits: 10_000,
    period: 'month',
    features: ['10K credit/month', '10 campaign', 'Residential proxy', 'Priority support'],
    color: 'indigo',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299_000,
    credits: 100_000,
    period: 'month',
    features: ['100K credit/month', '50 campaign', 'Mobile + Residential', 'AI-Powered Routing', 'Multi GEO', '24/7 support'],
    color: 'purple',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    credits: 0,
    period: 'month',
    features: ['Custom credit/month', 'Unlimited campaign', 'Dedicated proxy', 'AI-Powered Routing', 'SLA + API', 'Custom integration'],
    color: 'amber',
  },
] as const

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack_10k', credits: 10_000, priceIdr: 50_000, label: '10K Credits', bonus: 0 },
  { id: 'pack_50k', credits: 50_000, priceIdr: 200_000, label: '50K Credits', bonus: 5000 },
  { id: 'pack_100k', credits: 100_000, priceIdr: 350_000, label: '100K Credits', bonus: 15000 },
  { id: 'pack_500k', credits: 500_000, priceIdr: 1_500_000, label: '500K Credits', bonus: 100000 },
] as const

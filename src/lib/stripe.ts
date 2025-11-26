import { loadStripe } from '@stripe/stripe-js';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

console.log('Stripe key present:', !!stripeKey);
console.log('Stripe key starts with pk_:', stripeKey?.startsWith('pk_'));

if (!stripeKey) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

export const stripePromise = loadStripe(stripeKey);

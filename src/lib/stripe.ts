import Stripe from "stripe";
import { config, stripeEnabled } from "./config";

// Lazy Stripe client — null when STRIPE_SECRET_KEY is unset so the app runs
// without billing configured. Card data never touches our server (APP_BLUEPRINT §9).
export const stripe = stripeEnabled
  ? new Stripe(config.stripe.secretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion })
  : null;

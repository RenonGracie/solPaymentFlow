// Square Payment Configuration
// In production, these values should come from environment variables

export const SQUARE_CONFIG = {
  // Sandbox Application ID (replace with your actual Square application ID)
  applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || 'sandbox-sq0idb-YOUR_APP_ID_HERE',

  // Sandbox Location ID (replace with your actual Square location ID)
  locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'sandbox-location-id',

  // Environment - 'sandbox' for testing, 'production' for live payments
  environment: (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',

  // API Base URL
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
} as const;

// Payment amounts in cents (Square uses cents)
export const PAYMENT_AMOUNTS = {
  outOfPocket: 3000, // $30.00 in cents
  averageInsuranceCopay: 3750, // $37.50 average co-pay in cents
} as const;

// Supported payment methods
export const SUPPORTED_PAYMENT_METHODS = [
  'card',
  // Future: 'ach', 'google-pay', 'apple-pay'
] as const;

// Square Web SDK URL
export const SQUARE_WEB_SDK_URL = 'https://js.squareup.com/v2/paymentform';

// Payment processing configuration
export const PAYMENT_CONFIG = {
  // Timeout for payment processing (in milliseconds)
  timeout: 30000,

  // Retry attempts for failed payments
  maxRetries: 3,

  // Currency (Square supports multiple currencies)
  currency: 'USD',

  // Application name (appears on receipts)
  applicationName: 'Sol Health',

  // Description for charges
  defaultDescription: 'Sol Health Therapy Session',
} as const;

// Validation rules
export const VALIDATION_RULES = {
  minAmount: 100, // $1.00 minimum in cents
  maxAmount: 10000, // $100.00 maximum per session in cents
} as const;

// config/paypalConfig.js
import paypal from 'paypal-rest-sdk';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

// Configure PayPal SDK with credentials from environment variables
paypal.configure({
    'mode': process.env.PAYPAL_MODE, // 'sandbox' for testing, 'live' for production
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

export default paypal; // Export the configured PayPal object for use in controllers

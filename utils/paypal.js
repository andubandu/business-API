require('dotenv').config();
const axios = require('axios');

const PAYPAL_API = process.env.PAYPAL_BASE_URL;

async function getPayPalAccessToken() {
  const PAYPAL_API = process.env.PAYPAL_MODE_LIVE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );   return response.data;
  } catch (error) {
    console.error('PayPal Auth Error Detail:', error.response?.data || error.message);
    throw new Error('Could not generate PayPal Access Token');
  }
}
async function capturePayment(orderId) {
  const accessToken = await getPayPalAccessToken();

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error capturing payment:', error.response?.data || error.message);
    throw new Error('Payment capture failed');
  }
}

async function processPayoutToSeller(sellerEmail, amount, currency = 'USD', note, transactionId) {
  const accessToken = await getPayPalAccessToken();
  const roundedAmount = (Math.round(amount * 100) / 100).toFixed(2);

  const payoutData = {
    sender_batch_header: {
      sender_batch_id: `batch_${transactionId}_${Date.now()}`,
      email_subject: 'You have a payment from Developer Marketplace',
      email_message: 'Payment received for your completed milestone.',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: roundedAmount,
          currency: currency,
        },
        receiver: sellerEmail,
        note: note,
        sender_item_id: transactionId,
      },
    ],
  };

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v1/payments/payouts`,
      payoutData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Payout failed:', error.response?.data || error.message);
    throw new Error(`PayPal payout failed: ${error.response?.data?.message || error.message}`);
  }
}

async function processRefundToBuyer(captureId, amount, currency = 'USD', note) {
  const accessToken = await getPayPalAccessToken();
  const roundedAmount = (Math.round(amount * 100) / 100).toFixed(2);

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/payments/captures/${captureId}/refund`,
      {
        amount: {
          value: roundedAmount,
          currency_code: currency
        },
        note_to_payer: note
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Refund failed:', error.response?.data || error.message);
    throw new Error('Refund failed');
  }
}

const getPayPalConfig = () => {
    const isLive = process.env.PAYPAL_MODE_LIVE === 'live';
    return {
        baseUrl: isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET
    };
};

module.exports = {
  capturePayment,
  processPayoutToSeller,
  processRefundToBuyer,
  getPayPalAccessToken,
  getPayPalConfig
};

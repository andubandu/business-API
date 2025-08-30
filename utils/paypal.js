require('dotenv').config();
const axios = require('axios');

async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    throw new Error('Failed to get PayPal access token');
  }
}

async function processPayoutToSeller(sellerEmail, amount, currency, note, transactionId) {
  try {
    const accessToken = await getPayPalAccessToken();
    
    const roundedAmount = Math.round(amount * 100) / 100;
    
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `batch_${transactionId}_${Date.now()}`,
        email_subject: "You have received a payment from Developer Marketplace",
        email_message: "You have received a payment for your service. Thank you for using our platform!"
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: roundedAmount.toFixed(2),
            currency: currency
          },
          receiver: sellerEmail,
          note: note,
          sender_item_id: transactionId
        }
      ]
    };

    const response = await axios.post(`${process.env.PAYPAL_BASE_URL}/v1/payments/payouts`, 
      payoutData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`PayPal payout failed: ${error.response?.data?.message || error.message}`);
  }
}

async function verifyPayPalAccount(email) {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  } catch (error) {
    return false;
  }
}

module.exports = {
  getPayPalAccessToken,
  processPayoutToSeller,
  verifyPayPalAccount
};
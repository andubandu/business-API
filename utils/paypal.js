require('dotenv').config();
const axios = require('axios');
const paypal = require('@paypal/checkout-server-sdk')
const client = new paypal.core.PayPalHttpClient(
  new paypal.core.LiveEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
)

async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

    const res = await fetch(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to get token: ${errText}`);
    }

    const data = await res.json();
    // console.log('Access token:', data.access_token);
    return data.access_token;
  } catch (err) {
    console.error('Error fetching PayPal token:', err.message);
  }
}

async function processRefundToBuyer(email, amount, currency, note) {
  const request = new paypal.payments.CapturesRefundRequest(email)
  request.requestBody({
    amount: { value: amount.toFixed(2), currency_code: currency },
    note_to_payer: note
  })
  const response = await client.execute(request)
  return response.result
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
  verifyPayPalAccount,
  processRefundToBuyer
};

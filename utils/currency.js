const axios = require('axios');

async function getExchangeRates() {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    return response.data.rates;
  } catch (error) {
    return { USD: 1, EUR: 0.85, GEL: 2.7 };
  }
}

async function convertPrice(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  const rates = await getExchangeRates();
  const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
  return toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency];
}

module.exports = { getExchangeRates, convertPrice };
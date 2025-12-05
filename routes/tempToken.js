const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.get('/chat-token/:chatId', (req, res) => {
  const userToken = req.headers.authorization?.split(' ')[1];
  if (!userToken) return res.status(401).json({ error: 'No user token provided' });

  const { chatId } = req.params;
  const payload = { token: userToken, chatId };

  const tempToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.json({ tempToken });
});

module.exports = router;

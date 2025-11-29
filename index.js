require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const http = require('http')
const { initSocket } = require('./config/socket')
const setupSwagger = require('./config/swagger.js')
const Cart = require('./models/Cart.js')
const path = require('path')
const app = express()
const server = http.createServer(app)

const io = initSocket(server)
app.set('io', io)
app.enable('trust proxy')
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
  })
)
app.use(passport.initialize())
app.use(passport.session())

setupSwagger(app)

mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))

app.use('/auth', require('./routes/auth'))
app.use('/users', require('./routes/users'))
app.use('/services', require('./routes/services'))
app.use('/admin', require('./routes/admin'))
app.use('/payments', require('./routes/payments'))
app.use('/', require('./routes/verification'))
app.use('/paypal', require('./routes/paypal'))
app.use('/cart', require('./routes/cart'))
app.use('/notifications', require('./routes/notifications'))
app.use('/rating', require('./routes/ratings'))
app.use('/feedback', require('./routes/feedbacks'))
app.use('/proposals', require('./routes/proposals'))
app.use('/chat', require('./routes/chat'))
app.get('/favicon', (req, res) => {
  res.sendFile(path.join(__dirname, 'download-4.png'))
})
app.get('/', (req, res) => res.redirect('/api-docs'))
app.get('/inbox', (req, res) => res.render('inbox'))

const crypto = require('crypto')
const ENC_SECRET = process.env.ENC_SECRET

function encryptToken(data) {
  const key = Buffer.from(ENC_SECRET, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

function decryptToken(token) {
  const key = Buffer.from(ENC_SECRET, 'hex')
  const [ivHex, encrypted] = token.split(':')
  if (!ivHex || !encrypted) throw new Error('Malformed token')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return JSON.parse(decrypted)
}

app.get('/redirect', require('./middleware/auth').authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) return res.status(404).json({ error: 'Cart not found' })

    const payload = {
      cartID: cart._id.toString(),
      userID: req.user._id.toString(),
      nonce: crypto.randomBytes(8).toString('hex'),
      ts: Date.now()
    }
    const encryptedToken = encryptToken(payload)
    const checkoutUrl = `${process.env.BASE_URL}/payments/cart/checkout?token=${encodeURIComponent(encryptedToken)}`

    res.json({ message: 'Checkout link generated', checkout_url: checkoutUrl, expires_in: '5 minutes' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

server.listen(3000, () => console.log('server socketrunning on http://localhost:3000'))

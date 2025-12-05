require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const http = require('http')
const { initSocket } = require('./config/socket')
const setupSwagger = require('./config/swagger.js')
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
cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' }

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
app.use('/notifications', require('./routes/notifications'))
app.use('/rating', require('./routes/ratings'))
app.use('/feedback', require('./routes/feedbacks'))
app.use('/proposals', require('./routes/proposals'))
app.use('/chat', require('./routes/chat'))
app.use('/milestones', require('./routes/milestones'))
app.use('/api', require('./routes/tempToken'));
app.get('/', (req, res) => res.redirect('/api-docs'))
app.get('/inbox', (req, res) => res.render('inbox'))
const startScheduler = require('./config/scheduler')
startScheduler()

server.listen(3000, () => console.log('server socketrunning on http://localhost:3000'))

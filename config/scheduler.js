const cron = require('node-cron')
const Milestone = require('../models/Milestone')
const Proposal = require('../models/Proposal')
const { processRefundToBuyer } = require('../utils/paypal')
const { notifyRefundProcessed } = require('../utils/notifications')

module.exports = () => {
  cron.schedule('*/10 * * * *', async () => {
    const now = new Date()

    try {
      const tasks = await Milestone.find({
        dueDate: { $lt: now },
        status: { $in: ['pending', 'in_progress'] }
      }).populate('proposal')

      for (const m of tasks) {
        if (!m.proposal) continue

        m.status = 'refunded'
        await m.save()

        try {
          await processRefundToBuyer(
            m.proposal.buyer.paypal_account.email,
            m.price,
            'USD',
            `Refund for overdue milestone: ${m.title}`
          )

          await notifyRefundProcessed(m.proposal.buyer._id, m)
        } catch (err) {
          console.log('Refund failed for milestone', m._id, err.message)
        }
      }
    } catch (err) {
      console.log('Cron error:', err.message)
    }
  })
}

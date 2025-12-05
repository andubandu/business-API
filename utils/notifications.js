const Notification = require('../models/Notification.js');
const User = require('../models/User.js');

async function createNotification(recipientId, type, title, message, data = {}, senderId = null) {
  console.log('[Notification] createNotification called:', { recipientId, type, title });

  try {
    if (!recipientId) throw new Error('recipientId is required');
    if (!type) throw new Error('Notification type is required');

    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      data
    });

    await notification.save();
    console.log('[Notification] Saved notification:', notification._id);

    const io = require('../index').io || global.io;
    if (io) {
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'username real_name profile_image')
        .populate('data.serviceId', 'title price currency')
        .lean();

      io.to(`user_${recipientId}`).emit('new_notification', populatedNotification);

      const unreadCount = await Notification.countDocuments({ recipient: recipientId, read: false });
      io.to(`user_${recipientId}`).emit('unread_count_updated', unreadCount);

      console.log(`[Notification] Emitted events for user ${recipientId}`);
    } else {
      console.warn('[Notification] Socket.io instance not found, skipping emit');
    }

    return notification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    return null;
  }
}

async function notifyVerificationApproved(userId, approvedRole) {
  const title = `✅ Verification Approved!`;
  const message = `Congratulations! Your verification request for "${approvedRole}" role has been approved. You can now create and sell services on our platform.`;
  return createNotification(userId, 'verification_approved', title, message);
}

async function notifyVerificationRejected(userId, requestedRole) {
  const title = `❌ Verification Rejected`;
  const message = `Your verification request for "${requestedRole}" role has been rejected. Please review the requirements and submit a new application with additional proof of work.`;
  return createNotification(userId, 'verification_rejected', title, message);
}

async function notifyServicePurchase(sellerId, buyerId, service, transaction) {
  try {
    const buyer = await User.findById(buyerId).select('real_name username').lean();
    const buyerName = buyer?.real_name || 'Anonymous customer';
    const buyerUsername = buyer ? `@${buyer.username}` : '';

    const title = `🎉 Service Purchased!`;
    const message = `Your service "${service.title}" was purchased for ${transaction.amountPaid} ${transaction.currency} by ${buyerName} ${buyerUsername}. You will receive ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} (90% after platform fee).`;

    return await createNotification(
      sellerId,
      'purchase',
      title,
      message,
      {
        serviceId: service._id,
        transactionId: transaction._id,
        amount: transaction.developerEarnings,
        currency: transaction.currency,
        buyerName,
        buyerUsername: buyer?.username || null
      },
      buyerId
    );
  } catch (error) {
    console.error('[Notification] Error notifying service purchase:', error);
    const title = `🎉 Service Purchased!`;
    const message = `Your service "${service.title}" was purchased for ${transaction.amountPaid} ${transaction.currency} by a customer. You will receive ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} (60% after platform fee).`;

    return createNotification(
      sellerId,
      'purchase',
      title,
      message,
      {
        serviceId: service._id,
        transactionId: transaction._id,
        amount: transaction.developerEarnings,
        currency: transaction.currency
      }
    );
  }
}

async function notifyRefundProcessed(userId, milestone) {
  await Notification.create({
    user: userId,
    type: 'refund_processed',
    message: `A milestone was refunded: ${milestone.title}`,
    data: { milestoneId: milestone._id, amount: milestone.price }
  })
}


async function notifyPayoutSent(sellerId, transaction, payoutId) {
  const title = `💰 Payment Sent!`;
  const message = `Your payment of ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} has been sent to your PayPal account. Payout ID: ${payoutId}`;
  return createNotification(
    sellerId,
    'payout_sent',
    title,
    message,
    {
      transactionId: transaction._id,
      amount: transaction.developerEarnings,
      currency: transaction.currency,
      payoutId
    }
  );
}

async function notifyPayoutFailed(sellerId, transaction, error) {
  const title = `⚠️ Payment Failed`;
  const message = `Your payment of ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} failed to send. Error: ${error}. Our team will process this manually.`;
  return createNotification(
    sellerId,
    'payout_failed',
    title,
    message,
    {
      transactionId: transaction._id,
      amount: transaction.developerEarnings,
      currency: transaction.currency
    }
  );
}

async function notifySystemMessage(userId, title, message) {
  return createNotification(
    userId,
    'system',
    title,
    message
  );
}

module.exports = {
  createNotification,
  notifyVerificationApproved,
  notifyVerificationRejected,
  notifyServicePurchase,
  notifyPayoutSent,
  notifyPayoutFailed,
  notifySystemMessage,
  notifyRefundProcessed
};

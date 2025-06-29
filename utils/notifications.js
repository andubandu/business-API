const Notification = require('../models/Notification');
const User = require('../models/User');

async function createNotification(recipientId, type, title, message, data = {}, senderId = null) {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      data
    });

    await notification.save();
    
    const io = require('../index').io || global.io;
    if (io) {
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'username real_name profile_image')
        .populate('data.serviceId', 'title price currency');
      
      io.to(`user_${recipientId}`).emit('new_notification', populatedNotification);
      
      const unreadCount = await Notification.countDocuments({
        recipient: recipientId,
        read: false
      });
      
      io.to(`user_${recipientId}`).emit('unread_count_updated', unreadCount);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

async function notifyServicePurchase(sellerId, buyerId, service, transaction) {
  try {
    const buyer = await User.findById(buyerId).select('real_name username');
    const buyerName = buyer ? buyer.real_name : 'Anonymous customer';
    const buyerUsername = buyer ? `@${buyer.username}` : '';
    
    const title = `🎉 Service Purchased!`;
    const message = `Your service "${service.title}" was purchased for ${transaction.amountPaid} ${transaction.currency} by ${buyerName} ${buyerUsername}. You will receive ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} (60% after platform fee).`;
    
    return await createNotification(
      sellerId,
      buyerId,
      'purchase',
      title,
      message,
      {
        serviceId: service._id,
        transactionId: transaction._id,
        amount: transaction.developerEarnings,
        currency: transaction.currency,
        buyerName: buyerName,
        buyerUsername: buyer ? buyer.username : null
      }
    );
  } catch (error) {
    console.error('Error creating purchase notification:', error);
    const title = `🎉 Service Purchased!`;
    const message = `Your service "${service.title}" was purchased for ${transaction.amountPaid} ${transaction.currency} by a customer. You will receive ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} (60% after platform fee).`;
    
    return await createNotification(
      sellerId,
      buyerId,
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

async function notifyPayoutSent(sellerId, transaction, payoutId) {
  const title = `💰 Payment Sent!`;
  const message = `Your payment of ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} has been sent to your PayPal account. Payout ID: ${payoutId}`;
  
  return await createNotification(
    sellerId,
    null,
    'payout_sent',
    title,
    message,
    {
      transactionId: transaction._id,
      amount: transaction.developerEarnings,
      currency: transaction.currency,
      payoutId: payoutId
    }
  );
}

async function notifyPayoutFailed(sellerId, transaction, error) {
  const title = `⚠️ Payment Failed`;
  const message = `Your payment of ${transaction.developerEarnings.toFixed(2)} ${transaction.currency} failed to send. Error: ${error}. Our team will process this manually.`;
  
  return await createNotification(
    sellerId,
    null,
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

async function notifyVerificationApproved(userId, approvedRole) {
  const title = `✅ Verification Approved!`;
  const message = `Congratulations! Your verification request for "${approvedRole}" role has been approved. You can now create and sell services on our platform.`;
  
  return await createNotification(
    userId,
    null,
    'verification_approved',
    title,
    message
  );
}

async function notifyVerificationRejected(userId, requestedRole) {
  const title = `❌ Verification Rejected`;
  const message = `Your verification request for "${requestedRole}" role has been rejected. Please review the requirements and submit a new application with additional proof of work.`;
  
  return await createNotification(
    userId,
    null,
    'verification_rejected',
    title,
    message
  );
}

async function notifySystemMessage(userId, title, message) {
  return await createNotification(
    userId,
    null,
    'system',
    title,
    message
  );
}

module.exports = {
  createNotification,
  notifyServicePurchase,
  notifyPayoutSent,
  notifyPayoutFailed,
  notifyVerificationApproved,
  notifyVerificationRejected,
  notifySystemMessage
};
const Message = require('../models/Message');
const MessageTemplate = require('../models/MessageTemplate');
const User = require('../models/User');
const logger = require('./logger');
const {
  applyTemplateVariables,
  ensureDefaultTemplates,
} = require('./messageAdminHelpers');

const AUTOMATED_TEMPLATES = {
  WELCOME: 'Bienvenida',
  PREMIUM_ACTIVE: 'Premium activo',
  FIRST_LOGIN_GUIDE: 'Bienvenida extendida',
};

let cachedSystemAdminId = null;

async function resolveSystemAdminId() {
  if (cachedSystemAdminId) return cachedSystemAdminId;

  const admin =
    (await User.findOne({ isMainAdmin: true }).select('_id').lean()) ||
    (await User.findOne({ role: 'admin' }).select('_id').lean());

  if (admin?._id) {
    cachedSystemAdminId = admin._id;
  }

  return cachedSystemAdminId;
}

async function sendAutomatedTemplateMessage(userId, templateName) {
  try {
    await ensureDefaultTemplates();

    const tpl = await MessageTemplate.findOne({ name: templateName }).lean();
    if (!tpl) {
      logger.error('automated_message_template_missing', {
        templateName,
        userId: String(userId),
      });
      return null;
    }

    const adminId = await resolveSystemAdminId();
    if (!adminId) {
      logger.error('automated_message_no_admin', {
        templateName,
        userId: String(userId),
      });
      return null;
    }

    const user = await User.findById(userId)
      .select('nombre email premium_since trialEndsAt plan')
      .lean();
    if (!user) {
      logger.error('automated_message_user_missing', {
        templateName,
        userId: String(userId),
      });
      return null;
    }

    const message = await Message.create({
      user_id: userId,
      admin_id: adminId,
      titulo: applyTemplateVariables(tpl.titulo, user).slice(0, 200),
      contenido: applyTemplateVariables(tpl.contenido, user).slice(0, 5000),
      leido: false,
      campaign_id: null,
    });

    logger.info('automated_message_sent', {
      templateName,
      userId: String(userId),
      messageId: String(message._id),
    });

    return message;
  } catch (err) {
    logger.error('automated_message_error', {
      templateName,
      userId: String(userId),
      message: err.message,
    });
    return null;
  }
}

async function trySendFirstLoginGuideMessage(userId) {
  const reserved = await User.findOneAndUpdate(
    {
      _id: userId,
      onboardingGuideSent: { $ne: true },
      trialActive: true,
      tipo: { $ne: 'familia' },
      billingLocked: { $ne: true },
      plan: { $ne: 'free-family' },
    },
    { $set: { onboardingGuideSent: true } },
    { new: false }
  ).select('_id');

  if (!reserved) {
    return null;
  }

  try {
    const message = await sendAutomatedTemplateMessage(
      userId,
      AUTOMATED_TEMPLATES.FIRST_LOGIN_GUIDE
    );
    if (!message) {
      await User.updateOne({ _id: userId }, { $set: { onboardingGuideSent: false } });
    }
    return message;
  } catch (err) {
    await User.updateOne({ _id: userId }, { $set: { onboardingGuideSent: false } });
    throw err;
  }
}

function sendPremiumActiveAutomatedMessage(userId) {
  return sendAutomatedTemplateMessage(userId, AUTOMATED_TEMPLATES.PREMIUM_ACTIVE);
}

module.exports = {
  AUTOMATED_TEMPLATES,
  sendAutomatedTemplateMessage,
  trySendFirstLoginGuideMessage,
  sendPremiumActiveAutomatedMessage,
};

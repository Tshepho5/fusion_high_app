const express = require('express');
const router = express.Router();
const { auth } = require('../../../authMiddleware');
const whatsapp = require('../services/whatsappService');
const bot = require('../services/whatsappBot');

router.get('/business', (req, res) => {
  res.json({
    display: whatsapp.BUSINESS_DISPLAY,
    e164: whatsapp.BUSINESS_E164,
    link: `https://wa.me/${whatsapp.BUSINESS_E164}`,
    connected: whatsapp.configured()
  });
});

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages || [];
    for (const message of messages) {
      await bot.handleIncoming(message);
    }
  } catch (err) {
    console.warn('[WHATSAPP WEBHOOK]', err.message);
  }
});

router.get('/me', auth, async (req, res) => {
  const contact = await whatsapp.contactForUser(req.user.id);
  res.json({
    phone: contact?.phone || null,
    verified: Boolean(contact?.verified),
    business: whatsapp.BUSINESS_DISPLAY,
    link: `https://wa.me/${whatsapp.BUSINESS_E164}`
  });
});

router.post('/link', auth, async (req, res) => {
  const result = await whatsapp.startVerification(req.user.id, req.user.email, req.body.phone);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true, phone: result.phone, message: 'A confirmation code was sent on WhatsApp.' });
});

router.post('/confirm', auth, async (req, res) => {
  const result = await whatsapp.confirmVerification(req.user.id, req.body.code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true, phone: result.phone, message: 'This WhatsApp number will receive OTPs and Geleza notices.' });
});

module.exports = router;

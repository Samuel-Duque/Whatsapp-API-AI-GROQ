const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const conversationService = require('../services/conversationService');

/**
 * Rota GET para verificação do webhook do WhatsApp
 */
router.get('/', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (whatsappService.verifyWebhook(mode, token)) {
      console.log('Webhook verificado com sucesso!');
      res.status(200).send(challenge);
    } else {
      console.error('Verificação do webhook falhou');
      res.sendStatus(403);
    }
  } catch (error) {
    console.error('Erro na verificação do webhook:', error);
    res.sendStatus(500);
  }
});

/**
 * Rota POST para receber mensagens do webhook do WhatsApp
 */
router.post('/', async (req, res) => {
  try {
    // Responder rapidamente para evitar timeouts do webhook
    res.status(200).send('OK');
    
    // Processar os dados do webhook
    const result = whatsappService.processWebhook(req.body);
    
    if (!result.success) {
      console.warn('Webhook recebido mas não processado:', result.error);
      return;
    }
    
    const { messages } = result;
    
    // Processar cada mensagem recebida
    for (const message of messages) {
      await conversationService.processIncomingMessage(message);
    }
  } catch (error) {
    console.error('Erro ao processar webhook POST:', error);
    // Já enviamos a resposta 200, então apenas log do erro
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const conversationService = require('../services/conversationService');

/**
 * Rota para enviar uma mensagem diretamente para um usuário
 */
router.post('/send-message', async (req, res) => {
  try {
    const { to, message, useFallback = true } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Os campos "to" e "message" são obrigatórios'
      });
    }
    
    // Use o método com fallback se solicitado, senão use o método normal
    const result = useFallback 
      ? await whatsappService.sendMessageWithFallback(to, message) 
      : await whatsappService.sendTextMessage(to, message);
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Erro ao enviar mensagem via API:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para enviar uma mensagem de template (para iniciar conversas após 24h)
 */
router.post('/send-template', async (req, res) => {
  try {
    const { to, templateName, language = 'pt_BR', components = [] } = req.body;
    
    if (!to || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Os campos "to" e "templateName" são obrigatórios'
      });
    }
    
    const result = await whatsappService.sendTemplateMessage(
      to, 
      templateName, 
      language, 
      components
    );
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Erro ao enviar template via API:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para iniciar uma conversa usando template e depois continuar com IA
 */
router.post('/start-conversation', async (req, res) => {
  try {
    const { userId, templateName, language = 'pt_BR', components = [] } = req.body;
    
    if (!userId || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Os campos "userId" e "templateName" são obrigatórios'
      });
    }
    
    // Envia o template
    const result = await whatsappService.sendTemplateMessage(
      userId, 
      templateName, 
      language, 
      components
    );
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    // Adiciona ao histórico se for bem-sucedido
    conversationService.addToConversationHistory(userId, {
      role: 'assistant',
      content: 'Mensagem de template enviada: ' + templateName
    });
    
    return res.status(200).json({
      success: true,
      message: 'Conversa iniciada com sucesso',
      data: result.data
    });
  } catch (error) {
    console.error('Erro ao iniciar conversa:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para limpar o histórico de conversa de um usuário
 */
router.post('/clear-history', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'O campo "userId" é obrigatório'
      });
    }
    
    const result = conversationService.clearConversationHistory(userId);
    
    return res.status(200).json({
      success: true,
      message: 'Histórico de conversa limpo com sucesso'
    });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para enviar mensagem de boas-vindas para um usuário
 */
router.post('/send-welcome', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'O campo "userId" é obrigatório'
      });
    }
    
    const result = await conversationService.sendWelcomeMessage(userId);
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Erro ao enviar mensagem de boas-vindas:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para verificar status do serviço
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Serviço operando normalmente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 
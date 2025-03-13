const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const conversationService = require('../services/conversationService');
const contextService = require('../services/contextService');

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

/**
 * Rota para adicionar um novo contexto local
 */
router.post('/context', (req, res) => {
  try {
    const { id, contextData } = req.body;
    
    if (!id || !contextData) {
      return res.status(400).json({
        success: false,
        error: 'Os campos "id" e "contextData" são obrigatórios'
      });
    }
    
    // Garante que só dados de Recife sejam adicionados
    const result = contextService.addContext(id, contextData);
    
    return res.status(result ? 200 : 400).json({
      success: result,
      message: result 
        ? 'Contexto adicionado com sucesso' 
        : 'Não foi possível adicionar o contexto, verifique se a localização está em Recife'
    });
  } catch (error) {
    console.error('Erro ao adicionar contexto:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para obter um contexto específico
 */
router.get('/context/:id', (req, res) => {
  try {
    const { id } = req.params;
    const context = contextService.getContext(id);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Contexto não encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Erro ao obter contexto:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para listar todos os contextos disponíveis
 */
router.get('/contexts', (req, res) => {
  try {
    const contexts = contextService.listAllContexts();
    
    return res.status(200).json({
      success: true,
      count: contexts.length,
      data: contexts
    });
  } catch (error) {
    console.error('Erro ao listar contextos:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para encontrar contextos próximos a uma localização
 */
router.post('/contexts/nearby', (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Os campos "latitude" e "longitude" são obrigatórios'
      });
    }
    
    const location = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    const searchRadius = radius ? parseInt(radius) : 500; // raio padrão: 500m
    
    const nearbyContexts = contextService.findContextsByLocation(location, searchRadius);
    
    return res.status(200).json({
      success: true,
      count: nearbyContexts.length,
      data: nearbyContexts
    });
  } catch (error) {
    console.error('Erro ao buscar contextos próximos:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para aplicar contexto a uma conversa atual
 * Isso permite que o contexto local seja injetado na conversa
 */
router.post('/apply-context', (req, res) => {
  try {
    const { userId, contextId } = req.body;
    
    if (!userId || !contextId) {
      return res.status(400).json({
        success: false,
        error: 'Os campos "userId" e "contextId" são obrigatórios'
      });
    }
    
    // Obtém o contexto
    const context = contextService.getContext(contextId);
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Contexto não encontrado'
      });
    }
    
    // Adiciona o contexto à conversa como uma mensagem de sistema
    conversationService.addSystemContext(userId, context);
    
    return res.status(200).json({
      success: true,
      message: `Contexto "${context.name}" aplicado à conversa com sucesso`
    });
  } catch (error) {
    console.error('Erro ao aplicar contexto:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rota para remover um contexto
 */
router.delete('/context/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = contextService.removeContext(id);
    
    return res.status(result ? 200 : 404).json({
      success: result,
      message: result 
        ? 'Contexto removido com sucesso' 
        : 'Contexto não encontrado'
    });
  } catch (error) {
    console.error('Erro ao remover contexto:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
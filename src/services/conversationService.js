const NodeCache = require('node-cache');
const whatsappService = require('./whatsappService');
const groqService = require('./groqService');

class ConversationService {
  constructor() {
    // Cache para armazenar históricos de conversa (TTL em segundos: 30 minutos)
    this.conversationCache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });
    
    // Mensagem de boas-vindas
    this.welcomeMessage = 'Olá! Sou uma IA assistente. Como posso ajudar você hoje?';
  }

  /**
   * Obtém o histórico de conversas para um determinado usuário
   * @param {string} userId - ID único do usuário (número de telefone)
   * @returns {Array} - Array com histórico de mensagens
   */
  getConversationHistory(userId) {
    return this.conversationCache.get(userId) || [];
  }

  /**
   * Adiciona uma mensagem ao histórico de conversas
   * @param {string} userId - ID único do usuário (número de telefone)
   * @param {Object} message - Objeto da mensagem {role: 'user'|'assistant', content: string}
   */
  addToConversationHistory(userId, message) {
    const history = this.getConversationHistory(userId);
    history.push(message);
    
    // Limitar histórico para as últimas 20 mensagens para evitar consumo excessivo de tokens
    const limitedHistory = history.slice(-20);
    
    this.conversationCache.set(userId, limitedHistory);
    return limitedHistory;
  }

  /**
   * Processa uma mensagem recebida e envia a resposta para o WhatsApp
   * @param {Object} message - Mensagem recebida
   * @returns {Promise<Object>} - Resultado do processamento
   */
  async processIncomingMessage(message) {
    try {
      const userId = message.from;
      const messageText = message.text;
      
      // Adicionar mensagem do usuário ao histórico
      const history = this.addToConversationHistory(userId, {
        role: 'user',
        content: messageText
      });
      
      // Obter resposta da IA
      const aiResponse = await groqService.getCompletion(messageText, history);
      
      if (!aiResponse.success) {
        throw new Error(`Falha ao obter resposta da IA: ${aiResponse.error}`);
      }
      
      // Adicionar resposta da IA ao histórico
      this.addToConversationHistory(userId, aiResponse.aiMessage);
      
      // Enviar resposta para o WhatsApp
      const result = await whatsappService.sendTextMessage(userId, aiResponse.message);
      
      if (!result.success) {
        throw new Error(`Falha ao enviar mensagem para o WhatsApp: ${result.error}`);
      }
      
      return {
        success: true,
        message: 'Mensagem processada e resposta enviada com sucesso',
        aiResponse: aiResponse.message
      };
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      // Tentar enviar mensagem de erro para o usuário
      try {
        await whatsappService.sendTextMessage(
          message.from,
          'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.'
        );
      } catch (sendError) {
        console.error('Erro ao enviar mensagem de erro:', sendError);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia uma mensagem de boas-vindas para um novo usuário
   * @param {string} userId - ID do usuário (número de telefone)
   */
  async sendWelcomeMessage(userId) {
    try {
      const result = await whatsappService.sendTextMessage(userId, this.welcomeMessage);
      
      if (result.success) {
        // Adicionar mensagem ao histórico
        this.addToConversationHistory(userId, {
          role: 'assistant',
          content: this.welcomeMessage
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao enviar mensagem de boas-vindas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpa o histórico de conversas de um usuário
   * @param {string} userId - ID do usuário
   * @returns {boolean} - Indica se a operação foi bem-sucedida
   */
  clearConversationHistory(userId) {
    return this.conversationCache.del(userId);
  }
}

module.exports = new ConversationService(); 
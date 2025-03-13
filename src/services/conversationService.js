const NodeCache = require('node-cache');
const whatsappService = require('./whatsappService');
const groqService = require('./groqService');

class ConversationService {
  constructor() {
    // Cache para armazenar históricos de conversa (TTL em segundos: 30 minutos)
    this.conversationCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    this.maxMessages = 10;
    
    // Mensagem de boas-vindas para novos usuários
    this.welcomeMessage = `✨ *Bem-vindo ao InfoCidadão* ✨

🏙️ Sua ponte digital com a cidade do Recife! Estamos entusiasmados em tê-lo conosco nesta jornada de cidadania ativa e informada.

🧭 *O que fazemos:*
Fornecemos informações em tempo real sobre locais específicos da nossa cidade. Ao chegar em pontos de interesse, você receberá automaticamente dados relevantes sobre o local, serviços disponíveis, história e eventos.

🔔 *Recursos principais:*
• Notificações baseadas em localização
• Informações sobre serviços públicos próximos
• Dados históricos e culturais dos espaços
• Eventos e atividades na sua região
• Canais diretos para serviços municipais

🤝 Esta é uma iniciativa da Prefeitura do Recife em parceria com a tecnologia para construir uma cidade mais conectada e cidadãos mais informados.

💡 *Como começar:* Compartilhe sua localização ou digite o nome do local sobre o qual deseja obter informações.

Estamos aqui para tornar sua experiência na cidade mais rica e conectada! 🌆`;
    
    // Template padrão para fallback (usado quando necessário iniciar conversas após 24h)
    this.defaultTemplate = 'hello_world';
    
    // Serviço de IA Groq para processamento de linguagem natural
    this.groqService = groqService;
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
    
    // Limitar histórico para evitar consumo excessivo de tokens
    const limitedHistory = history.slice(-this.maxMessages);
    
    this.conversationCache.set(userId, limitedHistory);
    return limitedHistory;
  }

  /**
   * Adiciona um contexto de sistema à conversa
   * @param {string} userId - ID único do usuário
   * @param {Object} context - Dados do contexto
   * @returns {Array} - Histórico atualizado
   */
  addSystemContext(userId, context) {
    // Preparar mensagem de sistema com o contexto
    const contextMessage = {
      role: 'system',
      content: `
Informações sobre o local atual do usuário em Recife:
Nome: ${context.name}
Descrição: ${context.description}
${context.info ? `Detalhes: ${context.info}` : ''}
${context.services ? `Serviços disponíveis: ${context.services.join(', ')}` : ''}
${context.events ? `Eventos: ${context.events}` : ''}
${context.history ? `História: ${context.history}` : ''}
${context.operatingHours ? `Horário de funcionamento: ${context.operatingHours}` : ''}

Instruções: Utilize essas informações para fornecer dados precisos e relevantes sobre este local em Recife quando o usuário fizer perguntas relacionadas. Foque suas respostas apenas em informações reais e verificáveis da cidade do Recife. Não forneça informações sobre outras cidades ou invente dados fictícios.
      `.trim()
    };
    
    // Obter histórico atual
    const history = this.getConversationHistory(userId);
    
    // Remover qualquer contexto de sistema anterior
    const filteredHistory = history.filter(msg => msg.role !== 'system');
    
    // Adicionar novo contexto no início do histórico
    filteredHistory.unshift(contextMessage);
    
    // Salvar histórico atualizado
    this.conversationCache.set(userId, filteredHistory);
    
    return filteredHistory;
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
      
      console.log(`📥 Processando mensagem de ${userId}: "${messageText}"`);
      
      // Verificar se é a primeira mensagem do usuário
      const history = this.getConversationHistory(userId);
      const isFirstMessage = history.length === 0;
      
      // Se for a primeira mensagem, enviar boas-vindas
      if (isFirstMessage) {
        console.log(`👋 Primeira mensagem detectada de ${userId}, enviando boas-vindas...`);
        await this.sendWelcomeMessage(userId);
        // Pequeno delay para garantir que a mensagem de boas-vindas seja processada primeiro
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Adicionar mensagem do usuário ao histórico
      this.addToConversationHistory(userId, {
        role: 'user',
        content: messageText
      });
      
      // Obter resposta da IA
      const aiResponse = await groqService.getCompletion(messageText, history);
      
      if (!aiResponse.success) {
        throw new Error(`Falha ao obter resposta da IA: ${aiResponse.error}`);
      }
      
      console.log(`🤖 Resposta da IA: "${aiResponse.message}"`);
      
      // Adicionar resposta da IA ao histórico
      this.addToConversationHistory(userId, aiResponse.aiMessage);
      
      // Enviar resposta para o WhatsApp com fallback para template
      const result = await whatsappService.sendMessageWithFallback(
        userId, 
        aiResponse.message,
        this.defaultTemplate
      );
      
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
        await whatsappService.sendMessageWithFallback(
          message.from,
          'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.',
          this.defaultTemplate
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
      // Tenta enviar como mensagem normal com fallback para template
      const result = await whatsappService.sendMessageWithFallback(
        userId, 
        this.welcomeMessage,
        this.defaultTemplate
      );
      
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
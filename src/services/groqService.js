const axios = require('axios');
const config = require('../config');

class GroqService {
  constructor() {
    this.apiKey = config.groq.apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.model = config.groq.model;
    this.maxTokens = config.groq.maxTokens;
    this.temperature = config.groq.temperature;
  }

  /**
   * Obtém uma resposta da IA do Groq baseada na mensagem do usuário
   * @param {string} userMessage - Mensagem do usuário
   * @param {Array} conversationHistory - Histórico da conversa (opcional)
   * @returns {Promise<Object>} - Objeto contendo a resposta da IA
   */
  async getCompletion(userMessage, conversationHistory = []) {
    try {
      // Preparar o histórico da conversa no formato esperado pela API
      const messages = [];
      
      // Adicionar histórico de conversa prévio
      for (const message of conversationHistory) {
        messages.push({
          role: message.role,
          content: message.content
        });
      }
      
      // Adicionar a mensagem atual do usuário
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Chamar a API do Groq
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: this.temperature
        }
      });

      const aiResponse = response.data.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
      
      return {
        success: true,
        message: aiResponse,
        usage: response.data.usage,
        // Retorna a mensagem adicionada ao histórico
        aiMessage: {
          role: 'assistant',
          content: aiResponse
        }
      };
    } catch (error) {
      console.error('Erro ao obter resposta do Groq:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Desculpe, ocorreu um erro ao processar sua solicitação.'
      };
    }
  }
}

module.exports = new GroqService(); 
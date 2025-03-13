const axios = require('axios');
const config = require('../config');

class WhatsAppService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.token = config.whatsapp.token;
  }

  /**
   * Normaliza um número de telefone para o formato esperado pelo WhatsApp
   * @param {string} phoneNumber - Número de telefone a ser normalizado
   * @returns {string} - Número normalizado
   */
  normalizePhoneNumber(phoneNumber) {
    // Remove qualquer caractere não numérico
    let normalized = phoneNumber.replace(/\D/g, '');
    
    // Se começar com '+', pode ter sido removido, então não fazemos nada adicional
    // Se não tiver o código do país (assumindo Brasil - 55), adicione-o
    if (normalized.length <= 12 && !normalized.startsWith('55')) {
      normalized = '55' + normalized;
    }
    
    // Limitamos a 15 dígitos conforme padrão internacional
    return normalized.substring(0, 15);
  }

  /**
   * Envia uma mensagem de texto para um número do WhatsApp
   * @param {string} to - Número de telefone de destino no formato internacional (ex: 5511999998888)
   * @param {string} text - Texto da mensagem
   * @returns {Promise} - Resultado da requisição
   */
  async sendTextMessage(to, text) {
    try {
      const normalizedTo = this.normalizePhoneNumber(to);
      console.log(`Enviando mensagem para número normalizado: ${normalizedTo} (original: ${to})`);
      
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        }
      });
      
      return {
        success: true,
        data: response.data,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Valida um webhook do WhatsApp
   * @param {string} mode - Modo de verificação
   * @param {string} token - Token de verificação
   * @returns {boolean} - Se a verificação é válida
   */
  verifyWebhook(mode, token) {
    return mode === 'subscribe' && token === config.whatsapp.verifyToken;
  }

  /**
   * Processa uma mensagem recebida do webhook
   * @param {Object} body - Corpo da requisição do webhook
   * @returns {Object} - Dados da mensagem processada
   */
  processWebhook(body) {
    try {
      if (!body.object || body.object !== 'whatsapp_business_account') {
        return { success: false, error: 'Evento inválido' };
      }

      // Extrair dados da mensagem
      const entries = body.entry || [];
      const messages = [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field !== 'messages') continue;

          const value = change.value || {};
          const messageList = value.messages || [];
          
          for (const message of messageList) {
            if (message.type === 'text') {
              const originalFrom = message.from;
              const normalizedFrom = this.normalizePhoneNumber(originalFrom);
              console.log(`Número original: ${originalFrom}, Normalizado: ${normalizedFrom}`);
              
              messages.push({
                from: normalizedFrom,
                id: message.id,
                timestamp: message.timestamp,
                text: message.text.body,
                type: 'text'
              });
            }
          }
        }
      }

      return {
        success: true,
        messages
      };
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WhatsAppService(); 
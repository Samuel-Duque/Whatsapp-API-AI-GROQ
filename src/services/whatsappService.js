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
    
    // Formata números brasileiros corretamente
    if (normalized.startsWith('55')) {
      // Número brasileiro completo deve ter 13 dígitos: 55 + DDD (2 dígitos) + 9 + número (8 dígitos)
      // Verifica se o número está com 12 dígitos (faltando o 9)
      if (normalized.length === 12) {
        // Adiciona o dígito 9 após o DDD (posição 4)
        normalized = normalized.slice(0, 4) + '9' + normalized.slice(4);
        console.log(`Adicionando dígito 9 após DDD: ${normalized}`);
      } else {
        console.log(`Formatando número brasileiro: ${normalized}`);
      }
      return normalized;
    } 
    // Para números que não começam com 55, adiciona o código do país
    else if (normalized.length <= 12) {
      const oldNumber = normalized;
      normalized = '55' + normalized;
      
      // Se o número adicionado do código do país não tem o 9 após DDD, adiciona-o
      if (normalized.length === 12) {
        normalized = normalized.slice(0, 4) + '9' + normalized.slice(4);
      }
      
      console.log(`Adicionando código do Brasil: ${oldNumber} -> ${normalized}`);
      return normalized;
    }
    
    // Para outros números internacionais
    return normalized;
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
      
      // Log the request payload for debugging
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      };
      
      console.log(`📤 Enviando payload para WhatsApp API: ${JSON.stringify(payload)}`);
      
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        data: payload
      });
      
      console.log(`✅ Resposta da API WhatsApp: ${JSON.stringify(response.data)}`);
      
      return {
        success: true,
        data: response.data,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
      // Detailed error logging
      if (error.response) {
        console.error('Detalhes do erro:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Envia uma mensagem de template para um número do WhatsApp
   * Útil para iniciar conversas após 24 horas sem interação
   * @param {string} to - Número de telefone de destino no formato internacional
   * @param {string} templateName - Nome do template aprovado no WhatsApp
   * @param {string} language - Código do idioma (default: pt_BR)
   * @param {Array} components - Componentes do template (opcional)
   * @returns {Promise} - Resultado da requisição
   */
  async sendTemplateMessage(to, templateName, language = 'pt_BR', components = []) {
    try {
      const normalizedTo = this.normalizePhoneNumber(to);
      console.log(`Enviando template para: ${normalizedTo}, template: ${templateName}`);
      
      // Log the request payload for debugging
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components: components
        }
      };
      
      console.log(`📤 Enviando payload de template para WhatsApp API: ${JSON.stringify(payload)}`);
      
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        data: payload
      });
      
      console.log(`✅ Resposta de template da API WhatsApp: ${JSON.stringify(response.data)}`);
      
      return {
        success: true,
        data: response.data,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem de template:', error.response?.data || error.message);
      // Detailed error logging
      if (error.response) {
        console.error('Detalhes do erro de template:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Tenta enviar mensagem de texto e, se falhar devido ao limite de 24h, tenta enviar um template
   * @param {string} to - Número de telefone de destino
   * @param {string} text - Texto da mensagem
   * @param {string} fallbackTemplate - Nome do template para fallback
   * @returns {Promise} - Resultado da requisição
   */
  async sendMessageWithFallback(to, text, fallbackTemplate = 'hello_world') {
    const result = await this.sendTextMessage(to, text);
    
    // Se a mensagem falhou devido ao limite de 24h (código 131047), tenta com template
    if (!result.success && 
        result.error?.error?.code === 131047) {
      console.log('Erro de limite de 24h detectado, tentando com template...');
      return this.sendTemplateMessage(to, fallbackTemplate);
    }
    
    return result;
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
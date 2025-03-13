require('dotenv').config();

module.exports = {
  // Configurações do WhatsApp
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    verifyToken: process.env.VERIFY_TOKEN || 'default_verify_token'
  },
  
  // Configurações da API do Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'deepseek-coder',
    maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7')
  },
  
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
  }
}; 
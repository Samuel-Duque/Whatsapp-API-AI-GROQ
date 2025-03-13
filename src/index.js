const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const webhookRoutes = require('./routes/webhookRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { errorMiddleware, setupGlobalErrorHandlers } = require('./utils/errorHandler');

// Configurar capturadores de erros globais
setupGlobalErrorHandlers();

// Inicializar aplicação Express
const app = express();
const port = process.env.PORT || config.server.port || 3000;

// Middlewares
app.use(bodyParser.json());

// Verificar se as configurações necessárias estão presentes
function checkRequiredConfig() {
  const requiredEnvVars = [
    { key: 'WHATSAPP_TOKEN', value: config.whatsapp.token },
    { key: 'WHATSAPP_PHONE_NUMBER_ID', value: config.whatsapp.phoneNumberId },
    { key: 'GROQ_API_KEY', value: config.groq.apiKey }
  ];

  const missingVars = requiredEnvVars.filter(item => !item.value);
  
  if (missingVars.length > 0) {
    console.error('CONFIGURAÇÃO INCOMPLETA! As seguintes variáveis de ambiente são obrigatórias:');
    missingVars.forEach(item => console.error(`- ${item.key}`));
    console.error('Verifique o arquivo .env ou as variáveis de ambiente');
    
    return false;
  }
  
  return true;
}

// Registrar rotas
app.use('/webhook', webhookRoutes);
app.use('/api', apiRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de integração WhatsApp-Groq em funcionamento.',
    docs: '/docs'
  });
});

// Rota para documentação
app.get('/docs', (req, res) => {
  res.json({
    webhookEndpoint: '/webhook',
    apiEndpoints: {
      'POST /api/send-message': 'Envia uma mensagem para um número de WhatsApp',
      'POST /api/clear-history': 'Limpa o histórico de conversa de um usuário',
      'POST /api/send-welcome': 'Envia mensagem de boas-vindas para um usuário',
      'GET /api/health': 'Verifica o status do serviço',
      'POST /api/context': 'Adiciona um novo contexto local',
      'GET /api/context/:id': 'Obtém um contexto específico',
      'GET /api/contexts': 'Lista todos os contextos disponíveis',
      'POST /api/contexts/nearby': 'Encontra contextos próximos a uma localização',
      'POST /api/apply-context': 'Aplica um contexto a uma conversa atual',
      'DELETE /api/context/:id': 'Remove um contexto'
    }
  });
});

// Middleware de tratamento de erros
app.use(errorMiddleware);

// Iniciar o servidor apenas se todas as configurações estiverem presentes
if (checkRequiredConfig()) {
  app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    console.log(`📱 Webhook URL: ${process.env.BASE_URL || `http://localhost:${port}`}/webhook`);
    console.log('🤖 Integração WhatsApp-Groq iniciada com sucesso!');
  });
} else {
  console.error('❌ Não foi possível iniciar o servidor devido a configurações ausentes.');
  process.exit(1);
} 
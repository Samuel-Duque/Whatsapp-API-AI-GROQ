# 🚀 Integração WhatsApp-Groq IA

Esta aplicação permite integrar a API do WhatsApp Business com a IA do Groq, possibilitando que usuários conversem diretamente com uma IA através do WhatsApp. A aplicação gerencia todo o fluxo de comunicação, mantendo o histórico das conversas e garantindo respostas contextualizadas.

## ✨ Funcionalidades

- ✅ Recebimento de mensagens via webhook do WhatsApp
- ✅ Processamento de mensagens com a IA do Groq
- ✅ Envio automático de respostas da IA de volta para o WhatsApp
- ✅ Gerenciamento de histórico de conversas
- ✅ API para envio manual de mensagens e gerenciamento

## 🔧 Pré-requisitos

- Node.js 14 ou superior
- Uma conta na plataforma Meta for Developers
- Um número de telefone do WhatsApp Business API
- Uma chave de API do Groq

## 📦 Instalação

1. Clone este repositório:
```bash
git clone https://github.com/seu-usuario/whatsapp-groq.git
cd whatsapp-groq
```

2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

4. Preencha o arquivo `.env` com suas credenciais:
```
# Configurações da API do WhatsApp
WHATSAPP_TOKEN=seu_token_de_acesso_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
WHATSAPP_APP_SECRET=seu_app_secret_aqui
VERIFY_TOKEN=token_de_verificacao_personalizado_aqui

# Configurações da API do Groq
GROQ_API_KEY=sua_chave_api_groq_aqui

# Configurações do servidor
PORT=3000
```

## 🚀 Uso

1. Inicie o servidor:
```bash
npm start
```

2. Para desenvolvimento (com hot reload):
```bash
npm run dev
```

3. Configure o webhook no painel de desenvolvedores do Meta:
   - URL do Webhook: `https://seu-dominio.com/webhook`
   - Token de Verificação: o mesmo valor definido em `VERIFY_TOKEN` no `.env`
   - Eventos para inscrição: `messages`

## 📚 Endpoints da API

### Webhook
- `GET /webhook` - Usado pelo WhatsApp para verificação do webhook
- `POST /webhook` - Recebe notificações do WhatsApp

### API
- `POST /api/send-message` - Envia uma mensagem para um número
  ```json
  {
    "to": "5511999998888",
    "message": "Olá! Como posso ajudar?"
  }
  ```

- `POST /api/clear-history` - Limpa histórico de conversa
  ```json
  {
    "userId": "5511999998888"
  }
  ```

- `POST /api/send-welcome` - Envia mensagem de boas-vindas
  ```json
  {
    "userId": "5511999998888"
  }
  ```

- `GET /api/health` - Verifica o status do serviço

## 🔒 Segurança

- Nunca comite seu arquivo `.env` ou exponha suas chaves API
- Implemente sempre HTTPS em produção
- Considere adicionar autenticação à API se necessário

## 📝 Configuração do WhatsApp Business

Para configurar o WhatsApp Business API:

1. Crie uma conta no [Facebook Developers](https://developers.facebook.com/)
2. Configure um aplicativo com a funcionalidade do WhatsApp
3. Obtenha o token de acesso e o ID do número de telefone
4. Configure o webhook conforme explicado acima

## 📝 Configuração do Groq

1. Crie uma conta em [Groq.ai](https://console.groq.com/)
2. Gere uma chave de API
3. Coloque a chave no arquivo `.env`

## 🙋‍♂️ FAQ

**P: Como faço para testar o webhook localmente?**
R: Você pode usar serviços como ngrok, localtunnel ou Cloudflare Tunnel para expor seu servidor local à internet.

**P: Quanto custa usar essas APIs?**
R: A API do WhatsApp Business tem um custo baseado no volume de mensagens. A API do Groq tem planos gratuitos e pagos. Consulte a documentação oficial para detalhes atualizados.

**P: Como personalizo o comportamento da IA?**
R: Você pode modificar o serviço `groqService.js` para alterar parâmetros como temperatura ou o modelo utilizado.

## 📈 Próximos passos

- [ ] Implementar sistema de autenticação para a API
- [ ] Adicionar suporte a mensagens multimídia
- [ ] Criar um painel administrativo
- [ ] Adicionar suporte para múltiplos números de WhatsApp 
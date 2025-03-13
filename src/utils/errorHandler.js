/**
 * Função para registrar erros da aplicação
 * @param {Error} error - Objeto de erro
 * @param {string} source - Fonte do erro
 * @param {Object} additionalInfo - Informações adicionais (opcional)
 */
function logError(error, source, additionalInfo = {}) {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] [${source}] Error: ${error.message}`);
  
  if (error.stack) {
    console.error(`Stack: ${error.stack}`);
  }
  
  if (Object.keys(additionalInfo).length > 0) {
    console.error('Additional Info:', JSON.stringify(additionalInfo, null, 2));
  }
}

/**
 * Middleware para tratamento de erros no Express
 */
function errorMiddleware(err, req, res, next) {
  logError(err, 'ExpressMiddleware', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Ocorreu um erro interno no servidor' 
      : err.message
  });
}

/**
 * Função de captura global de erros não tratados
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logError(error, 'UncaughtException');
    // Em produção, você pode querer reiniciar o processo após um erro não tratado
    if (process.env.NODE_ENV === 'production') {
      console.error('Erro não tratado. Reiniciando o processo...');
      process.exit(1);
    }
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logError(
      reason instanceof Error ? reason : new Error(String(reason)),
      'UnhandledRejection',
      { promise }
    );
  });
}

module.exports = {
  logError,
  errorMiddleware,
  setupGlobalErrorHandlers
}; 
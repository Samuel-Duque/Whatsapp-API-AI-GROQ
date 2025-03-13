const NodeCache = require('node-cache');

/**
 * Serviço para gerenciar contextos sobre locais em Recife
 * Armazena informações específicas sobre pontos de interesse,
 * eventos, serviços públicos e outros dados relevantes
 */
class ContextService {
  constructor() {
    // Cache para armazenar os contextos (TTL em segundos: 24 horas)
    this.contextCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });
    
    // Sistema de ativação por localização - armazena raios de ação em metros
    this.locationTriggers = new Map();
    
    // Inicializa com alguns contextos padrão de Recife
    this.initializeDefaultContexts();
  }

  /**
   * Inicializa contextos padrão importantes para a cidade do Recife
   * Adiciona locais e pontos turísticos importantes
   */
  initializeDefaultContexts() {
    // Marco Zero
    this.addContext('marco_zero', {
      name: 'Marco Zero',
      description: 'Praça central e histórica do Recife, ponto de medida de todas as distâncias na cidade',
      location: { latitude: -8.063053, longitude: -34.871099 },
      info: 'O Marco Zero é um dos principais pontos turísticos do Recife, localizado no Bairro do Recife. É o marco oficial que representa o local onde a cidade foi fundada. A partir dele, medem-se as distâncias da capital pernambucana para outras localidades. A praça abriga uma estátua de bronze de Barão do Rio Branco e é cercada por edifícios históricos.',
      services: ['Informações turísticas', 'Alimentação nas proximidades', 'Passeios de catamarã'],
      events: 'Frequentemente ocorrem apresentações culturais, especialmente durante o Carnaval e outras festividades locais.'
    });
    
    // Rua do Bom Jesus
    this.addContext('rua_bom_jesus', {
      name: 'Rua do Bom Jesus',
      description: 'Rua histórica em Recife Antigo, antiga Rua dos Judeus',
      location: { latitude: -8.062457, longitude: -34.872466 },
      info: 'A Rua do Bom Jesus é uma das mais antigas e famosas do Recife. Antigamente conhecida como Rua dos Judeus, por ter abrigado a primeira sinagoga das Américas, hoje é um ponto cultural importante com casarões coloridos, bares e restaurantes. Durante o domingo, se transforma em um polo de atrações com música ao vivo.',
      services: ['Bares e restaurantes', 'Lojas de artesanato', 'Pontos culturais'],
      history: 'Abrigou a primeira sinagoga das Américas, Kahal Zur Israel, construída durante o período holandês no Brasil.'
    });
    
    // Paço do Frevo
    this.addContext('paco_do_frevo', {
      name: 'Paço do Frevo',
      description: 'Museu dedicado ao frevo, Patrimônio Imaterial da Humanidade',
      location: { latitude: -8.062151, longitude: -34.872022 },
      info: 'O Paço do Frevo é um espaço cultural dedicado à difusão, pesquisa e ensino do frevo, ritmo pernambucano declarado Patrimônio Imaterial da Humanidade pela UNESCO. O museu possui exposições permanentes e temporárias, além de oferecer aulas de dança.',
      services: ['Exposições', 'Aulas de dança', 'Biblioteca especializada', 'Loja de souvenirs'],
      operatingHours: 'Terça a sexta: 10h às 17h, Sábados e domingos: 11h às 18h'
    });
  }

  /**
   * Adiciona um novo contexto ao serviço
   * @param {string} id - Identificador único do contexto
   * @param {Object} contextData - Dados do contexto
   * @returns {boolean} - Sucesso da operação
   */
  addContext(id, contextData) {
    // Valida se é um local em Recife (validação simples por coordenadas)
    if (contextData.location) {
      const { latitude, longitude } = contextData.location;
      const recifeArea = {
        minLat: -8.16, maxLat: -7.93,  // Limites aproximados de Recife
        minLng: -35.00, maxLng: -34.80
      };
      
      const isInRecife = latitude >= recifeArea.minLat && latitude <= recifeArea.maxLat &&
                         longitude >= recifeArea.minLng && longitude <= recifeArea.maxLng;
      
      if (!isInRecife) {
        console.warn(`Localização ${id} está fora dos limites de Recife e não será adicionada.`);
        return false;
      }
      
      // Se tiver um raio de ativação, registra no sistema de trigger por localização
      if (contextData.triggerRadius) {
        this.locationTriggers.set(id, {
          location: contextData.location,
          radius: contextData.triggerRadius // raio em metros
        });
      }
    }
    
    // Adiciona timestamp
    contextData.updatedAt = new Date().toISOString();
    this.contextCache.set(id, contextData);
    return true;
  }

  /**
   * Obtém um contexto pelo seu identificador
   * @param {string} id - Identificador único do contexto
   * @returns {Object|null} - Dados do contexto ou null se não existir
   */
  getContext(id) {
    return this.contextCache.get(id) || null;
  }

  /**
   * Lista todos os contextos disponíveis
   * @returns {Array} - Lista de contextos
   */
  listAllContexts() {
    const keys = this.contextCache.keys();
    return keys.map(key => {
      const context = this.contextCache.get(key);
      return {
        id: key,
        name: context.name,
        description: context.description,
        location: context.location
      };
    });
  }

  /**
   * Encontra contextos próximos a uma localização
   * @param {Object} location - Coordenadas {latitude, longitude}
   * @param {number} radius - Raio de busca em metros (padrão: 500m)
   * @returns {Array} - Contextos encontrados na proximidade
   */
  findContextsByLocation(location, radius = 500) {
    const { latitude, longitude } = location;
    const nearbyContexts = [];
    
    const keys = this.contextCache.keys();
    for (const key of keys) {
      const context = this.contextCache.get(key);
      if (context.location) {
        const distance = this.calculateDistance(
          latitude, longitude,
          context.location.latitude, context.location.longitude
        );
        
        // Se estiver dentro do raio especificado (converte para metros)
        if (distance * 1000 <= radius) {
          nearbyContexts.push({
            id: key,
            ...context,
            distance: Math.round(distance * 1000) // distância em metros
          });
        }
      }
    }
    
    // Ordena do mais próximo ao mais distante
    return nearbyContexts.sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine
   * @param {number} lat1 - Latitude do ponto 1
   * @param {number} lon1 - Longitude do ponto 1
   * @param {number} lat2 - Latitude do ponto 2
   * @param {number} lon2 - Longitude do ponto 2
   * @returns {number} - Distância em quilômetros
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distância em km
    return distance;
  }
  
  /**
   * Converte graus para radianos
   * @param {number} deg - Ângulo em graus
   * @returns {number} - Ângulo em radianos
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
  
  /**
   * Remove um contexto
   * @param {string} id - Identificador do contexto
   * @returns {boolean} - Sucesso da operação
   */
  removeContext(id) {
    // Remove também do sistema de triggers se existir
    if (this.locationTriggers.has(id)) {
      this.locationTriggers.delete(id);
    }
    return this.contextCache.del(id);
  }
}

module.exports = new ContextService(); 
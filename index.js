const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;

// Configurar cliente do Discord com todas as intents necessárias
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers
  ]
});

// Variáveis globais para armazenar as informações do usuário
let userStatus = 'offline';
let userAvatar = null;
let userTag = null;
let lastAvatarCheck = 0;
const USER_ID = '874517110678765618'; // ID do usuário que você quer monitorar
const AVATAR_CHECK_INTERVAL = 60 * 1000; // Verificar avatar a cada 1 minuto

// Rota principal para o dashboard
app.get('/', (req, res) => {
  // Exibir o dashboard ao invés de apenas "Bot está ativo!"
  res.send(`
    <html>
      <head>
        <title>Discord Status Monitor</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .status { padding: 10px; border: 1px solid #ccc; margin: 20px 0; }
          .user-info { display: flex; align-items: center; }
          .avatar { width: 80px; height: 80px; border-radius: 50%; margin-right: 15px; }
          .status-indicator { width: 20px; height: 20px; border-radius: 50%; display: inline-block; margin-right: 10px; }
          .online { background-color: #43b581; }
          .idle { background-color: #faa61a; }
          .dnd { background-color: #f04747; }
          .offline { background-color: #747f8d; }
          .ping-info { background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Discord Status Monitor</h1>
        <div class="user-info">
          <img id="avatarImage" class="avatar" src="${userAvatar || '/img/default_avatar.png'}" alt="Avatar do usuário">
          <div>
            <h2 id="username">${userTag || 'Usuário Discord'}</h2>
            <p>
              <span id="statusIndicator" class="status-indicator ${userStatus}"></span>
              Status atual: <span id="currentStatus">${userStatus}</span>
            </p>
          </div>
        </div>
        <div class="status">
          <p>Para usar a API, acesse: <code>${req.protocol}://${req.get('host')}/status</code></p>
          <p>Exemplo de resposta:</p>
          <pre>{
  "userId": "${USER_ID}",
  "username": "${userTag || 'exemplo#0000'}",
  "status": "${userStatus}",
  "statusImage": "${getStatusImageUrl(userStatus)}",
  "avatarUrl": "${userAvatar || 'URL do avatar'}",
  "timestamp": "${new Date().toISOString()}"
}</pre>
        </div>
        <div class="ping-info">
          <h3>Sistema Keep-Alive</h3>
          <p>Bot está ativo! Sistema de ping está rodando a cada 5 minutos.</p>
          <p>Último ping: <span id="lastPing">${new Date().toISOString()}</span></p>
          <p>Última verificação de avatar: <span id="lastAvatarCheck">${new Date(lastAvatarCheck).toISOString()}</span></p>
        </div>
        <script>
          // Atualizar status na página a cada 5 segundos
          setInterval(() => {
            fetch('/status')
              .then(response => response.json())
              .then(data => {
                document.getElementById('currentStatus').innerText = data.status;
                document.getElementById('statusIndicator').className = 'status-indicator ' + data.status;
                document.getElementById('username').innerText = data.username || 'Usuário Discord';
                if (data.avatarUrl) {
                  document.getElementById('avatarImage').src = data.avatarUrl + '?t=' + new Date().getTime();
                }
                document.getElementById('lastPing').innerText = data.timestamp;
                if(data.lastAvatarCheck) {
                  document.getElementById('lastAvatarCheck').innerText = data.lastAvatarCheck;
                }
              });
          }, 5000);

          // Ping automático para manter o bot ativo
          setInterval(() => {
            fetch('/ping')
              .then(response => response.text())
              .then(data => {
                console.log('Auto-ping realizado pelo cliente web');
              });
          }, 5000);
        </script>
      </body>
    </html>
  `);
  console.log(`[${new Date().toISOString()}] Dashboard acessado`);
});

// Função para verificar e atualizar as informações do usuário
async function updateUserInfo() {
  try {
    // Forçar a obtenção do usuário novamente
    const user = await client.users.fetch(USER_ID, { force: true });
    if (user) {
      const newAvatar = user.displayAvatarURL({ size: 2048, format: 'png', dynamic: true });
      
      // Verificar se o avatar mudou
      if (newAvatar !== userAvatar) {
        console.log(`[${new Date().toISOString()}] Avatar atualizado: ${newAvatar}`);
        userAvatar = newAvatar;
      }
      
      // Atualizar a tag do usuário também
      userTag = user.tag;
      
      // Buscar o status em todos os servidores
      let foundInServer = false;
      client.guilds.cache.forEach(async (guild) => {
        try {
          const member = await guild.members.fetch(USER_ID);
          if (member) {
            foundInServer = true;
            userStatus = member.presence ? member.presence.status : 'offline';
            
            // Verificar avatar do servidor
            const memberAvatar = member.displayAvatarURL({ size: 2048, format: 'png', dynamic: true });
            if (memberAvatar !== userAvatar) {
              console.log(`[${new Date().toISOString()}] Avatar do servidor atualizado: ${memberAvatar}`);
              userAvatar = memberAvatar;
            }
          }
        } catch (e) {
          // Ignorar erros ao buscar membro em servidores específicos
        }
      });
      
      lastAvatarCheck = Date.now();
      console.log(`[${new Date().toISOString()}] Informações do usuário atualizadas com sucesso`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao atualizar informações do usuário:`, err);
  }
}

// ===== OUTRAS ROTAS E CONFIGURAÇÕES (mantidas do código original) =====

// ===== ROTAS ADICIONAIS PARA A API =====
// Criar endpoint para obter o status atual do usuário
app.get('/status', (req, res) => {
  // Adicionar cabeçalhos CORS para permitir acesso de outros domínios
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // Adicionar parâmetro de tempo para evitar cache
  const avatarUrlWithCache = userAvatar ? 
    userAvatar + (userAvatar.includes('?') ? '&' : '?') + 't=' + Date.now() : null;

  res.json({ 
    userId: USER_ID,
    username: userTag,
    status: userStatus,
    statusImage: getStatusImageUrl(userStatus),
    avatarUrl: avatarUrlWithCache,
    timestamp: new Date().toISOString(),
    lastAvatarCheck: new Date(lastAvatarCheck).toISOString()
  });

  console.log(`[${new Date().toISOString()}] Requisição de status atendida`);
});

// Função para retornar URL da imagem baseada no status
function getStatusImageUrl(status) {
  switch(status) {
    case 'online': return '/img/online.png';
    case 'idle': return '/img/idle.png';
    case 'dnd': return '/img/dnd.png';
    default: return '/img/offline.png';
  }
}

// Iniciar o servidor Express ANTES de iniciar o bot
app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Servidor web iniciado na porta ${port}`);

  // Inicie o bot Discord DEPOIS que o servidor estiver funcionando
  startBot();
});

// Função separada para iniciar o bot
function startBot() {
  console.log(`[${new Date().toISOString()}] Iniciando o bot Discord...`);

  // Evento quando o bot estiver pronto
  
client.once('ready', async () => {
  console.log(`[${new Date().toISOString()}] Bot iniciado como ${client.user.tag}`);
  
  // Adicione estas duas linhas:
  client.user.setStatus('online'); // ou 'idle', 'dnd', 'invisible'
  client.user.setActivity('monitorando status', { type: 'WATCHING' });
  
  // Resto do seu código permanece igual:
  await updateUserInfo();
  setInterval(updateUserInfo, AVATAR_CHECK_INTERVAL);
});
    
    // Definir atividade do bot (opcional)
    client.user.setActivity('só fazendo o meu papel...', { type: 'WATCHING' });
    // Outros tipos: 'PLAYING', 'STREAMING', 'LISTENING', 'COMPETING'
    
    // Fazer a verificação inicial
    await updateUserInfo();
    
    // Configurar verificação periódica do avatar e informações do usuário
    setInterval(updateUserInfo, AVATAR_CHECK_INTERVAL);
  });

  // Monitorar mudanças de presença
  client.on('presenceUpdate', (oldPresence, newPresence) => {
    if (newPresence.userId === USER_ID) {
      userStatus = newPresence.status;
      console.log(`[${new Date().toISOString()}] Status atualizado para: ${userStatus}`);
    }
  });

  // Fazer login com o token do bot
  client.login(process.env.TOKEN).catch(err => {
    console.error(`[${new Date().toISOString()}] Erro ao fazer login no Discord:`, err);
  });
}

// ===== SISTEMA KEEP-ALIVE PARA RENDER =====
// Função para realizar ping no próprio serviço
function pingService() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] PING INTERNO: Mantendo o serviço ativo`);
  
  // Obtém a URL do serviço a partir das variáveis de ambiente do Render
  // ou usa localhost em ambiente de desenvolvimento
  const serviceUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}/ping`;
  
  try {
    fetch(serviceUrl)
      .then(response => console.log(`[${timestamp}] Auto-ping bem-sucedido`))
      .catch(err => console.log(`[${timestamp}] Erro no auto-ping: ${err.message}`));
  } catch (error) {
    console.log(`[${timestamp}] Exceção no auto-ping: ${error.message}`);
  }
}

// Ping a cada 5 minutos para evitar inatividade no Render
setInterval(pingService, 5 * 60 * 1000);

// Ping adicional mais frequente para estabilidade (a cada 30 segundos)
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Micro-ping interno para garantir atividade`);
}, 30 * 1000);

// Certificar-se de que o bot continue rodando mesmo se houver erros não tratados
process.on('uncaughtException', function(err) {
  console.error(`[${new Date().toISOString()}] ERRO NÃO TRATADO: `, err);
  console.log('O bot continuará funcionando apesar do erro.');
});

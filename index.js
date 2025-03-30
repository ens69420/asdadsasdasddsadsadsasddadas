r-radius: 50%; margin-right: 15px; }
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
          <p>Bot está ativo! Sistema de ping está rodando a cada 20 segundos.</p>
          <p>Último ping: <span id="lastPing">${new Date().toISOString()}</span></p>
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
                  document.getElementById('avatarImage').src = data.avatarUrl;
                }
                document.getElementById('lastPing').innerText = data.timestamp;
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

// ===== ROTA ESPECÍFICA PARA UPTIMEROBOT =====
app.get('/monitor', (req, res) => {
  const timestamp = new Date().toISOString();
  res.status(200).send(`Monitor ativo! Última verificação: ${timestamp}`);
  console.log(`[${timestamp}] Verificação do UptimeRobot recebida`);
});

// Ajuste esta parte do seu código para usar a URL correta do Replit
setInterval(() => {
  console.log(`[${new Date().toISOString()}] PING INTERNO: Mantendo o serviço ativo`);

  // Use a URL do seu Replit específica aqui
  const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/ping`;

  try {
    fetch(replitUrl)
      .then(response => console.log(`[${new Date().toISOString()}] Auto-ping bem-sucedido`))
      .catch(err => console.log(`[${new Date().toISOString()}] Erro no auto-ping, mas continuando...`));
  } catch (error) {
    // Ignorar erros
  }
}, 10000); // Reduzido para cada 10 segundos

// Rota específica para pings, que é frequentemente acessada
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
  console.log(`[${new Date().toISOString()}] Ping recebido!`);
});

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

    try {
      // Tentar obter o usuário diretamente da API do Discord
      const user = await client.users.fetch(USER_ID, { force: true });
      if (user) {
        userAvatar = user.displayAvatarURL({ size: 2048, format: 'png', dynamic: true });
        userTag = user.tag;
        console.log(`[${new Date().toISOString()}] Informações básicas do usuário obtidas: ${userTag}`);
        console.log(`[${new Date().toISOString()}] Avatar URL: ${userAvatar}`);
      }

      // Aguardar um pouco para garantir que todas as caches estejam carregadas
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar o usuário em todos os servidores que o bot está
      let userFound = false;

      client.guilds.cache.forEach(async (guild) => {
        try {
          console.log(`[${new Date().toISOString()}] Verificando no servidor: ${guild.name} (${guild.id})`);

          // Tentar buscar o membro específico diretamente
          try {
            const member = await guild.members.fetch(USER_ID);
            if (member) {
              userFound = true;
              userStatus = member.presence ? member.presence.status : 'offline';
              console.log(`[${new Date().toISOString()}] Usuário encontrado no servidor ${guild.name} com status: ${userStatus}`);

              // Obter avatar do servidor, que pode ser diferente do avatar global
              const memberAvatar = member.displayAvatarURL({ size: 2048, format: 'png', dynamic: true });
              if (memberAvatar !== userAvatar) {
                console.log(`[${new Date().toISOString()}] Avatar do servidor encontrado: ${memberAvatar}`);
                // Preferir o avatar do servidor, se disponível
                userAvatar = memberAvatar;
              }
            }
          } catch (memberError) {
            console.log(`[${new Date().toISOString()}] Membro não encontrado no servidor ${guild.name}: ${memberError.message}`);
          }
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Erro ao verificar o servidor ${guild.name}:`, err);
        }
      });

      // Verificar após um tempo se o usuário foi encontrado
      setTimeout(() => {
        if (!userFound) {
          console.log(`[${new Date().toISOString()}] AVISO: Usuário com ID ${USER_ID} não foi encontrado em nenhum servidor. Verifique se o ID está correto e se o bot está no mesmo servidor que o usuário.`);
        }
      }, 5000);

    } catch (err) {
      console.error(`[${new Date().toISOString()}] Erro durante a inicialização:`, err);
    }
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

// ===== SISTEMA DE PING INTERNO MUITO MAIS FREQUENTE =====
// Ping a cada 20 segundos em vez de 1 minuto
setInterval(() => {
  console.log(`[${new Date().toISOString()}] PING INTERNO: Mantendo o serviço ativo`);

  // Se o URL do Replit estiver disponível, faça um auto-ping
  const replitUrl = process.env.REPL_SLUG ? 
    `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/ping` : 
    null;

  if (replitUrl) {
    try {
      fetch(replitUrl).catch(err => {
        // Ignorar erros de fetch - o importante é manter a VM ativa
        console.log(`[${new Date().toISOString()}] Auto-ping realizado para ${replitUrl}`);
      });
    } catch (error) {
      // Ignorar qualquer erro
    }
  }
}, 20000); // A cada 20 segundos (muito mais frequente)

// Ping adicional extremamente frequente (a cada 5 segundos)
// para situações de alta garantia de uptime
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Micro-ping interno para garantir atividade`);
}, 5000);

// ===== ROTAS ADICIONAIS PARA A API =====
// Criar endpoint para obter o status atual do usuário
app.get('/status', (req, res) => {
  // Adicionar cabeçalhos CORS para permitir acesso de outros domínios
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  res.json({ 
    userId: USER_ID,
    username: userTag,
    status: userStatus,
    statusImage: getStatusImageUrl(userStatus),
    avatarUrl: userAvatar,
    timestamp: new Date().toISOString()
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

// Certificar-se de que o bot continue rodando mesmo se houver erros não tratados
process.on('uncaughtException', function(err) {
  console.error(`[${new Date().toISOString()}] ERRO NÃO TRATADO: `, err);
  console.log('O bot continuará funcionando apesar do erro.');
});

// Pinging UptimeRobot como uma camada adicional de keep-alive
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Tentando ping externo como camada adicional de segurança`);
}, 30000);
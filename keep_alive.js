const express = require('express');
const app = express();
const port = 3000;

// Rota simples para manter o bot ativo
app.get('/', (req, res) => {
  res.writeHead(200);
  res.end('Bot está ativo!');
  console.log('Ping recebido para manter o bot online');
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor keep-alive rodando na porta ${port}`);
});

module.exports = app; // Exportar para poder ser usado no arquivo principal
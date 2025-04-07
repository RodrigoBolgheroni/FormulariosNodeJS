// src/server.js
const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Importando as rotas
const clienteRoutes = require('./routes/cliente');
const extensaoRoutes = require('./routes/extensoes');
const tipoarquivoRoutes = require('./routes/tipoarquivo');
const regraRoutes = require('./routes/regra');
const arquivoRoutes = require('./routes/arquivo');
const responsavelRoutes = require('./routes/responsavel');
require('dotenv').config();

// Middlewares para processar o corpo da requisição
app.use(express.urlencoded({ extended: true })); // Para formulários HTML
app.use(express.json()); // Para JSON

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Servindo a página de erro 500
app.get('/500', (req, res) => {
  res.sendFile(path.join(__dirname, '500.html'));
});

// Servindo os arquivos HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'clientes.html'));
});

// Rota para exibir o formulário cliente.html
app.get('/cliente', (req, res) => {
  res.sendFile(path.join(__dirname, 'clientes.html'));
});

// Rota para exibir o formulário responsavel.html
app.get('/responsavel', (req, res) => {
  res.sendFile(path.join(__dirname, 'responsaveis.html'));
});

// Rota para exibir o formulário regra
app.get('/regra', (req, res) => {
  res.sendFile(path.join(__dirname, 'regra.html'));
});

// Rota para exibir a tabela arquivo
app.get('/arquivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'arquivo.html'));
});

// Rota para exibir o formulário cliente.html
app.get('/cadastrocliente', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastrocliente.html'));
});

app.get('/cadastroregra', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastroregra.html'));
});

app.get('/cadastroarquivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastroarquivo.html'));
});

app.get('/cadastroregraarquivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastroregraarquivo.html'));
});

// Rota para exibir a página de Extensões
app.get('/extensao', (req, res) => {
  res.sendFile(path.join(__dirname, 'extensoes.html'));
});

// Rota para exibir o formulário de Extensão
app.get('/cadastroextensao', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastroextensao.html'));
});

// Rota para exibir a página de Tipos de Arquivos
app.get('/tipoarquivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'tiposdearquivos.html'));
});

// Rota para exibir o formulário de Tipo de Arquivo
app.get('/cadastrotipodearquivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastrotipodearquivo.html'));
});

// Usando as rotas da API
app.use(clienteRoutes); // Usando as rotas de clientes importadas de routes/cliente.js

app.use(extensaoRoutes); // Usando as rotas de clientes importadas de routes/extensao.js

app.use(arquivoRoutes); // Usando as rotas de clientes importadas de routes/arquivo.js

app.use(tipoarquivoRoutes); // Usando as rotas de clientes importadas de routes/tipoarquivo.js

app.use(regraRoutes); // Usando as rotas de clientes importadas de routes/regra.js

app.use(responsavelRoutes); // Usando as rotas de clientes importadas de routes/responsavel.js

// Iniciando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

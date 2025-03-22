require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
// src/conecta.js
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

module.exports = config;
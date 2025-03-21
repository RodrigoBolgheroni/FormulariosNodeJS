// Importar o pacote mssql
const sql = require('mssql');

// Configuração da conexão com o banco de dados SQL Server
const config = {
  user: 'ArkerBIQA',                 // Seu nome de usuário
  password: 'lrl1512Mj054*0LHb!Q',   // Sua senha
  server: 'sqlarkerbigdata01.database.windows.net', // O servidor do banco
  database: 'ArkerBIQA',             // Nome do banco de dados
  options: {
    encrypt: true, // A Azure requer criptografia
    trustServerCertificate: false // Não confie no certificado do servidor
  }
};

// Função para conectar e realizar uma consulta
async function connectToDatabase() {
  try {
    // Estabelecendo a conexão com o banco de dados
    await sql.connect(config);
    console.log('Conexão bem-sucedida!');

    // Realizando uma consulta no banco de dados
    const result = await sql.query('SELECT TOP 10 * FROM usuarios');
    console.log('Resultados da consulta:', result.recordset);

  } catch (err) {
    console.error('Erro ao conectar no banco de dados:', err.message);
  } finally {
    // Fechar a conexão com o banco de dados
    await sql.close();
    console.log('Conexão fechada.');
  }
}

// Chamar a função de conexão
connectToDatabase();

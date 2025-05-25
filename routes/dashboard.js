const express = require('express');
const sql = require('mssql');
const config = require('../conecta');

const router = express.Router();

const connectToDatabase = async (req, res, next) => {
    try {
      await sql.connect(config);
      next();
    } catch (err) {
      console.error('Erro ao conectar ao banco de dados:', err.message);
      res.status(500).send('Erro no servidor');
    }
  };
  
  const closeConnection = async () => {
    try {
      if (sql.connected) {
        await sql.close();
      }
    } catch (err) {
      console.error('Erro ao fechar conexão com o banco de dados:', err.message);
    }
  };












// Rota para buscar dados dos responsáveis por clienteId
router.get('/dashboard', connectToDatabase, async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query(`SELECT TOP (1000) ATU.[Id]
      ,ATU.[IdDataSet]
      ,ATU.[TipoAtualizacao]
      ,ATU.[DataInicioAtualizacao]
      ,ATU.[DataFimAtualizacao]
      ,ATU.[Status]
      ,ATU.[Mensagem]
      ,ATU.[DataInsercao]
      ,ATU.[DataAlteracao]
  FROM [dbo].[tblpbiatualizacao] AS ATU
  LEFT JOIN  [dbo].[tblpbidataset] AS DAT
  ON ATU.IdDataSet = DAT.IdDataSet
  LEFT JOIN [dbo].[tblpbiambiente] AS AMB
  ON DAT.IdAmbienteDataSet = AMB.IdAmbiente
  WHERE CAST(ATU.DataAlteracao AS DATE) = (SELECT MAX(CAST(DataAlteracao AS DATE)) FROM [dbo].[tblpbiatualizacao]) AND AMB.Ambiente='PROD'`);
        res.json(result.recordset);
      } catch (err) {
        console.error('Erro ao buscar dashboard:', err.message);
        res.status(500).send('Erro ao buscar dashboard');
      } finally {
        await closeConnection();
      }
  }
);


module.exports = router;   
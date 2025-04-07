// responsavel.js (arquivo de rotas)

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
router.get('/responsaveis', connectToDatabase, async (req, res) => {
  const clienteId = req.query.clienteId; // Lê o parâmetro clienteId da URL

  if (!clienteId) {
    // Se clienteId não for fornecido, retorna todos os responsáveis
    try {
        const request = new sql.Request();
        const result = await request.query('SELECT r.[IdResponsavel], r.[IdCliente],c.[Cliente] AS NomeCliente,r.[Responsavel],r.[Email],r.[Ativo] FROM [dbo].[tblresponsavelcliente] r JOIN [dbo].[tblcliente] c ON r.[IdCliente] = c.[IdCliente]');
        res.json(result.recordset);
      } catch (err) {
        console.error('Erro ao buscar clientes:', err.message);
        res.status(500).send('Erro ao buscar clientes');
      } finally {
        await closeConnection();
      }
  } else {
    // Se clienteId for fornecido, retorna os responsáveis do cliente específico
    try {
      const request = new sql.Request();
      request.input('clienteId', sql.Int, clienteId);

      // Consulta o banco de dados para buscar os responsáveis do cliente
      const responsaveis = await request.query(`
      SELECT 
        rc.[IdResponsavel],
        rc.[IdCliente],
        c.[Cliente] AS NomeCliente,
        rc.[Responsavel],
        rc.[Email],
        rc.[Ativo]
      FROM 
        [dbo].[tblresponsavelcliente] rc
      JOIN 
        [dbo].[tblcliente] c ON rc.[IdCliente] = c.[IdCliente]
      WHERE 
        rc.[IdCliente] = @clienteId
    `);

      // Retorna os responsáveis em formato JSON
      res.json(responsaveis.recordset);
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        await closeConnection();
    }
  }
});

// rota para deletar responsáveis por IdCliente
router.delete('/deletarResponsaveisPorCliente/:idCliente', connectToDatabase, async (req, res) => {
  const { idCliente } = req.params;

  try {
    const request = new sql.Request();
    request.input('idCliente', sql.Int, idCliente);

    const query = `
      DELETE FROM tblresponsavelcliente
      WHERE IdCliente = @idCliente
    `;

    const result = await request.query(query);

    // Não precisa verificar se algum registro foi afetado aqui, pois pode não haver responsáveis para o cliente.
    res.status(200).json({ message: 'Responsaveis deletados com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar responsáveis:', err.message);
    res.status(500).send('Erro ao deletar responsáveis');
  } finally {
    await closeConnection();
  }
});

// Rota para deletar um responsável específico por IdResponsavel
router.delete('/responsavel/:idResponsavel', connectToDatabase, async (req, res) => {
  const { idResponsavel } = req.params;

  try {
    const request = new sql.Request();
    
    // Primeiro, obtemos o IdCliente do responsável que será deletado
    request.input('idResponsavel', sql.Int, idResponsavel);
    const getClienteQuery = `
      SELECT IdCliente FROM tblresponsavelcliente
      WHERE IdResponsavel = @idResponsavel
    `;
    const clienteResult = await request.query(getClienteQuery);
    
    if (clienteResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Responsável não encontrado' });
    }
    
    const IdCliente = clienteResult.recordset[0].IdCliente;
    
    // Verifica quantos responsáveis ativos existem para este cliente
    const countRequest = new sql.Request();
    countRequest.input('IdCliente', sql.Int, IdCliente);
    const countQuery = `
      SELECT COUNT(*) AS TotalResponsaveis 
      FROM tblresponsavelcliente 
      WHERE IdCliente = @IdCliente AND Ativo = 1
    `;
    const countResult = await countRequest.query(countQuery);
    const totalResponsaveis = countResult.recordset[0].TotalResponsaveis;
    
    // Se for o último responsável ativo, não permite a exclusão
    if (totalResponsaveis <= 1) {
      return res.status(400).json({ 
        message: 'Não é possível deletar o último responsável ativo do cliente' 
      });
    }
    
    // Se não for o último, procede com a exclusão
    const deleteRequest = new sql.Request();
    deleteRequest.input('idResponsavel', sql.Int, idResponsavel);
    const deleteQuery = `
      DELETE FROM tblresponsavelcliente
      WHERE IdResponsavel = @idResponsavel
    `;
    const deleteResult = await deleteRequest.query(deleteQuery);

    if (deleteResult.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Responsável não encontrado' });
    }

    res.status(200).json({ message: 'Responsável deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar responsável:', err.message);
    res.status(500).json({ message: 'Erro ao deletar responsável' });
  } finally {
    await closeConnection();
  }
});

module.exports = router;

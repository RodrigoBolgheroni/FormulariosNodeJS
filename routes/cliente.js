const express = require('express');
const sql = require('mssql'); // Importando mssql
const config = require('../conecta'); // Importando a configuração de conexão
const axios = require('axios'); // Importe o axios

const router = express.Router();

// Middleware para conectar e desconectar do banco de dados
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

// Rota para buscar dados dos clientes
router.get('/clientes', connectToDatabase, async (req, res) => {
  try {
    const request = new sql.Request();
    const result = await request.query('SELECT [IdCliente], [Cliente], [Ativo] FROM tblcliente');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err.message);
    res.status(500).send('Erro ao buscar clientes');
  } finally {
    await closeConnection();
  }
});

// Rota para desativar um cliente
router.patch('/desativarCliente/:idCliente', connectToDatabase, async (req, res) => {
  const { idCliente } = req.params;
  const transaction = new sql.Transaction();

  try {
    await transaction.begin();
    // 1. Deletar os responsáveis do cliente usando a nova rota em responsavel.js
    try {
      await axios.delete(`http://localhost:3001/deletarResponsaveisPorCliente/${idCliente}`);
    } catch (error) {
      console.error('Erro ao deletar responsáveis:', error.message);
      throw error; // Lança o erro para ser capturado pelo bloco catch externo
    }

    // 2. Deletar o cliente
    const request = new sql.Request(transaction);
    request.input('idCliente', sql.Int, idCliente);
    const query = `
      DELETE FROM tblcliente 
      WHERE IdCliente = @idCliente
    `;

    const result = await request.query(query);

    // Verifica se algum registro foi afetado
    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    await transaction.commit();
    res.status(200).json({ message: 'Cliente deletado com sucesso' });
  } catch (err) {
    if (transaction.active) {
      await transaction.rollback();
    }
    console.error('Erro ao deletar cliente:', err.message);
    res.status(500).send('Erro ao deletar cliente');
  } finally {
    await closeConnection();
  }
});

// Rota para exibir a página de edição do cliente
router.get('/editarCliente/:idCliente', connectToDatabase, async (req, res) => {
  const { idCliente } = req.params;

  try {
    const request = new sql.Request();
    request.input('idCliente', sql.Int, idCliente);

    // Busca os dados do cliente
    const clienteQuery = `
      SELECT IdCliente, Cliente, Ativo 
      FROM tblcliente 
      WHERE IdCliente = @idCliente
    `;
    const clienteResult = await request.query(clienteQuery);

    if (clienteResult.recordset.length === 0) {
      return res.status(404).send('Cliente não encontrado');
    }

    const cliente = clienteResult.recordset[0];

    // Busca os responsáveis do cliente
    const responsaveisQuery = `
      SELECT IdResponsavel, Responsavel, Email, Ativo
      FROM tblresponsavelcliente
      WHERE IdCliente = @idCliente
    `;
    const responsaveisResult = await request.query(responsaveisQuery);
    const responsaveis = responsaveisResult.recordset;

    // Renderiza o formulário de edição com o HTML original e os dados dos responsáveis
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
            <head>
          <meta charset="utf-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="">
          <meta name="author" content="">
          <link rel="icon" type="image/png" sizes="16x16" href="../plugins/images/favicon.png">
          <title>Editar Cliente - Arker Data Admin</title>
          <link href="../bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
          <link href="../plugins/bower_components/sidebar-nav/dist/sidebar-nav.min.css" rel="stylesheet">
          <link href="../plugins/bower_components/toast-master/css/jquery.toast.css" rel="stylesheet">
          <link href="../plugins/bower_components/morrisjs/morris.css" rel="stylesheet">
          <link href="../plugins/bower_components/chartist-js/dist/chartist.min.css" rel="stylesheet">
          <link href="../plugins/bower_components/chartist-plugin-tooltip-master/dist/chartist-plugin-tooltip.css" rel="stylesheet">
          <link href="../plugins/bower_components/calendar/dist/fullcalendar.css" rel="stylesheet" />
          <link href="../css/animate.css" rel="stylesheet">
          <link href="../css/style.css" rel="stylesheet">
          <link href="../css/colors/gray-dark.css" id="theme" rel="stylesheet">
      </head>
      <body class="fix-header">
                    <div class="preloader">
              <svg class="circular" viewBox="25 25 50 50">
                  <circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="2" stroke-miterlimit="10" />
              </svg>
          </div>

          <div id="wrapper">
              <nav class="navbar navbar-default navbar-static-top m-b-0">
                  <div class="navbar-header">
                      <div class="top-left-part">
                          <a class="logo" href="index.html">
                              <span class="hidden-xs">
                                  <img src="/plugins/images/logo.webp" alt="home" class="dark-logo" / width="200px">
                              </span>
                          </a>
                      </div>
                  </div>
              </nav>

<div class="navbar-default sidebar" role="navigation">
            <div class="sidebar-nav slimscrollsidebar">
                <div class="sidebar-head">
                    <h3><span class="fa-fw open-close"><i class="ti-menu hidden-xs"></i><i class="ti-close visible-xs"></i></span> <span class="hide-menu"></span></h3>
                </div>
                <ul class="nav" id="side-menu">
                    <li><a href="/dash"><i class="mdi mdi-chart-bar"></i><span class="hide-menu"> Dashboard</span></a></li>
                    <li> <a class="waves-effect active"><i class="mdi mdi-table fa-fw"></i> <span class="hide-menu">Tabelas<span class="fa arrow"></span></span></a>
                        <ul class="nav nav-second-level">
                            <li><a href="/cliente"><i class="ti-user fa-fw"></i><span class="hide-menu">Cliente</span></a></li>
                            <li><a href="/tipoarquivo"><i class="ti-files fa-fw"></i><span class="hide-menu">Tipo Arquivo</span></a></li>
                            <li><a href="/extensao"><i class="ti-file fa-fw"></i><span class="hide-menu">Extensão</span></a></li>
                            <li><a href="/regra"><i class="ti-key fa-fw"></i><span class="hide-menu">Regra</span></a></li>
                            <li><a href="/arquivo"><i class="ti-file fa-fw"></i><span class="hide-menu">Arquivo</span></a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
          <div id="page-wrapper">
                                <div class="container-fluid">
                      <div class="row bg-title">
                          <div class="col-lg-3 col-md-4 col-sm-4 col-xs-12">
                              <h4 class="page-title">Editar Cliente</h4>
                          </div>
                          <div class="col-lg-9 col-sm-8 col-md-8 col-xs-12">
                              <ol class="breadcrumb">
                                  <li><a href="#">Tabelas</a></li>
                                  <li class="active">Clientes</li>
                              </ol>
                          </div>
                      </div>
              <div class="row">
                  <div class="col-sm-12">
                      <div class="panel">
                          <div class="panel-heading">
                              Editar Cliente
                          </div>
                          <div class="panel-body">
                              <form action="/editarCliente" method="POST">
                                  <div class="form-group" style="display: none;">
                                      <input id="IdCliente" name="IdCliente" value="${cliente.IdCliente}" readonly>
                                  </div>
                                  <div>
                                    <div class="form-group" style="display: flex;">
                                        <div style="margin-right: 30px;width: 50%;">
                                            <label for="cliente">Nome do Cliente *</label>
                                            <input type="text" class="form-control" id="clienteNovo" value="${cliente.Cliente}" name="clienteNovo" required>
                                        </div>
                                        <div style="width: 50%;">
                                            <label for="ativo">Ativo *</label>
                                            <select class="form-control" id="ativo" name="ativo">
                                                <option value="1" ${cliente.Ativo === 1 ? 'selected' : ''}>Sim</option>
                                                <option value="0" ${cliente.Ativo === 0 ? 'selected' : ''}>Não</option>
                                            </select>
                                        </div>
                                    </div>
                                  </div>
                                  <hr>
                                  <!-- Responsáveis -->
<div class="form-group">
    <div id="responsaveisContainer">
    ${
      responsaveis.map((responsavel, index) => {
        const ehUltimo = index === responsaveis.length - 1;
        const ehNovo = !responsavel.IdResponsavel; // Se não tem ID, é novo
    
        return `
          <div class="responsavel" data-index="${index}" style="display: flex; margin-bottom: 15px; gap: 10px;">
              <input type="hidden" name="responsaveis[${index}][IdResponsavel]" value="${responsavel.IdResponsavel || ''}">
              
              <div style="flex: 1;">
                  <label for="responsavelNome${index}">Nome Responsável *</label>
                  <input type="text" class="form-control" id="responsavelNome${index}" name="responsaveis[${index}][Responsavel]" value="${responsavel.Responsavel || ''}" required>
              </div>
              
              <div style="flex: 1;">
                  <label for="responsavelEmail${index}">Email Responsável *</label>
                  <input type="email" class="form-control" id="responsavelEmail${index}" name="responsaveis[${index}][Email]" value="${responsavel.Email || ''}" required>
              </div>
              
              <div style="width: 120px;">
                  <label for="responsavelAtivo${index}">Ativo *</label>
                  <select class="form-control" id="responsavelAtivo${index}" name="responsaveis[${index}][Ativo]">
                      <option value="1" ${responsavel.Ativo === 1 ? 'selected' : ''}>Sim</option>
                      <option value="0" ${responsavel.Ativo === 0 ? 'selected' : ''}>Não</option>
                  </select>
              </div>
    
              <div style="display: flex; flex-direction: column; justify-content: flex-end; gap: 5px;">
                  ${ehNovo ? `
                  
                      <button type="button" class="btn btn-danger btn-sm removerResponsavel">
                          <i class="fa fa-trash"></i>
                      </button>` : ''}
              </div>
          </div>
        `;
      }).join('')
    }
    
    
    
    </div>
</div>

                                <button type="submit" class="btn btn-primary">Salvar Cliente</button>                      
                                <button type="button" class="btn btn-success" id="adicionarResponsavel">
                          <i class="fa fa-plus"></i> Adicionar Responsavel
                      </button>
                              </form>
                          </div>
                      </div>
                  </div>
              </div>
              <footer class="footer text-center"> 2025 &copy; Arker  - arker.com.br  </footer>
          </div>
          <script src="../plugins/bower_components/jquery/dist/jquery.min.js"></script>
          <script src="../bootstrap/dist/js/bootstrap.min.js"></script>
          <script src="../plugins/bower_components/sidebar-nav/dist/sidebar-nav.min.js"></script>
          <script src="../js/jquery.slimscroll.js"></script>
          <script src="../js/waves.js"></script>
          <script src="../plugins/bower_components/waypoints/lib/jquery.waypoints.js"></script>
          <script src="../plugins/bower_components/counterup/jquery.counterup.min.js"></script>
          <script src="../plugins/bower_components/chartist-js/dist/chartist.min.js"></script>
          <script src="../plugins/bower_components/chartist-plugin-tooltip-master/dist/chartist-plugin-tooltip.min.js"></script>
          <script src="../plugins/bower_components/moment/moment.js"></script>
          <script src='../plugins/bower_components/calendar/dist/fullcalendar.min.js'></script>
          <script src="../plugins/bower_components/calendar/dist/cal-init.js"></script>
          <script src="../js/custom.min.js"></script>
          <script src="../plugins/bower_components/toast-master/js/jquery.toast.js"></script>
          <script src="../plugins/bower_components/styleswitcher/jQuery.style.switcher.js"></script>
          <script>
            document.addEventListener('DOMContentLoaded', function() {
                const responsaveisContainer = document.getElementById('responsaveisContainer');
                const adicionarResponsavelBtn = document.getElementById('adicionarResponsavel');
                let responsavelIndex = ${responsaveis.length};

                adicionarResponsavelBtn.addEventListener('click', function() {
                    const novoResponsavel = document.createElement('div');
                    novoResponsavel.classList.add('responsavel');
                    novoResponsavel.dataset.index = responsavelIndex;
                    novoResponsavel.style.cssText = \`display: flex; margin-bottom: 15px;\`;
                    novoResponsavel.innerHTML = \`
                        <input type="hidden" name="responsaveis[\${responsavelIndex}][IdResponsavel]" value="">
                        <div style="margin-right: 30px; width: 100%;">
                            <label for="responsavelNome\${responsavelIndex}">Nome Responsável *</label>
                            <input type="text" class="form-control" id="responsavelNome\${responsavelIndex}" name="responsaveis[\${responsavelIndex}][Responsavel]" required>
                        </div>
                        <div style="margin-right: 30px; width: 100%;">
                            <label for="responsavelEmail\${responsavelIndex}">Email Responsável *</label>
                            <input type="email" class="form-control" id="responsavelEmail\${responsavelIndex}" name="responsaveis[\${responsavelIndex}][Email]" required>
                        </div>
                        <div style="width: 100%;">
                            <label for="responsavelAtivo\${responsavelIndex}">Ativo *</label>
                            <select class="form-control" id="responsavelAtivo\${responsavelIndex}" name="responsaveis[\${responsavelIndex}][Ativo]">
                                <option value="1">Sim</option>
                                <option value="0">Não</option>
                            </select>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm removerResponsavel"style="margin-left: 10px; align-self: flex-end;"><i class="fa fa-trash"></i></button>
                    \`;
                    responsaveisContainer.appendChild(novoResponsavel);
                    responsavelIndex++;
                });

                responsaveisContainer.addEventListener('click', function(event) {
                    if (event.target.classList.contains('removerResponsavel') ||
                        event.target.closest('.removerResponsavel')) {
                        
                        const responsavelDiv = event.target.closest('.responsavel');
                        const index = parseInt(responsavelDiv.dataset.index);
                        if (index > 0) {
                            responsavelDiv.remove();
                        }
                    }
                });

            });
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Erro ao buscar cliente:', err.message);
    res.status(500).send('Erro ao buscar cliente');
  } finally {
    await closeConnection();
  }
});


// Rota para editar um cliente
router.post('/editarCliente', connectToDatabase, async (req, res) => {
  const { IdCliente, cliente, clienteNovo, ativo, responsaveis } = req.body;
  const transaction = new sql.Transaction();

  try {
    await transaction.begin();
    const nomeFinal = clienteNovo && clienteNovo.trim() !== '' ? clienteNovo : cliente;

    // 1. Atualiza os dados do cliente
    const requestCliente = new sql.Request(transaction);
    requestCliente.input('nomeFinal', sql.VarChar, nomeFinal);
    requestCliente.input('ativo', sql.Int, ativo);
    requestCliente.input('IdCliente', sql.Int, IdCliente);

    const updateClienteQuery = `
      UPDATE tblcliente 
      SET Cliente = @nomeFinal, Ativo = @ativo 
      WHERE IdCliente = @IdCliente
    `;
    await requestCliente.query(updateClienteQuery);

    // 2. Processa os responsáveis
    if (responsaveis && Array.isArray(responsaveis)) {
      for (const responsavel of responsaveis) {
        const { IdResponsavel, Responsavel, Email, Ativo } = responsavel;
        const requestResponsavel = new sql.Request(transaction);
        requestResponsavel.input('IdCliente', sql.Int, IdCliente);
        requestResponsavel.input('Responsavel', sql.VarChar, Responsavel);
        requestResponsavel.input('Email', sql.VarChar, Email);
        requestResponsavel.input('Ativo', sql.Int, Ativo);

        if (IdResponsavel) {
          // Atualiza o responsável existente
          requestResponsavel.input('IdResponsavel', sql.Int, IdResponsavel);
          const updateResponsavelQuery = `
            UPDATE tblresponsavelcliente
            SET Responsavel = @Responsavel, Email = @Email, Ativo = @Ativo
            WHERE IdResponsavel = @IdResponsavel
          `;
          await requestResponsavel.query(updateResponsavelQuery);
        } else {
          // Cria um novo responsável
          const insertResponsavelQuery = `
            INSERT INTO tblresponsavelcliente (IdCliente, Responsavel, Email, Ativo, DataInsercao)
            VALUES (@IdCliente, @Responsavel, @Email, @Ativo, GETDATE())
          `;
          await requestResponsavel.query(insertResponsavelQuery);
        }
      }
    }

    await transaction.commit();
    res.redirect('/cliente');
  } catch (err) {
    if (transaction.active) {
      await transaction.rollback();
    }
    console.error('Erro ao atualizar cliente:', err.message);
    res.status(500).send('Erro ao atualizar cliente');
  } finally {
    await closeConnection();
  }
});


// Rota para cadastrar um cliente
router.post('/cadastrocliente', connectToDatabase, async (req, res) => {
  const { cliente, ativo, responsavel_nome, responsavel_email, responsavel_ativo } = req.body;

  if (!cliente || !ativo) {
    return res.status(400).json({
      success: false,
      errorMessage: 'Dados inválidos',
      errorDetails: 'Nome do cliente e status são obrigatórios'
    });
  }
  let clientecerto = cliente.trim().toLowerCase()

  const transaction = new sql.Transaction();

  try {
    await transaction.begin();

    // 1. Cadastra o cliente e obtém o ID
    const clienteRequest = new sql.Request(transaction);
    clienteRequest.input('cliente', sql.VarChar, clientecerto);
    clienteRequest.input('ativo', sql.Int, ativo);

    const clienteQuery = `
      INSERT INTO tblcliente (Cliente, Ativo, DataInsercao)
      OUTPUT INSERTED.IdCliente
      VALUES (@cliente, @ativo, GETDATE())
    `;

    const clienteResult = await clienteRequest.query(clienteQuery);
    const IdCliente = clienteResult.recordset[0].IdCliente;

    // 2. Cadastra cada responsável
    if (responsavel_nome && responsavel_nome.length > 0) {
      for (let i = 0; i < responsavel_nome.length; i++) {
        const responsavelRequest = new sql.Request(transaction);
        
        responsavelRequest.input('IdCliente', sql.Int, IdCliente);
        responsavelRequest.input('responsavel', sql.VarChar, responsavel_nome[i]);
        responsavelRequest.input('email', sql.VarChar, responsavel_email[i]);
        responsavelRequest.input('ativo', sql.Int, responsavel_ativo[i]);

        const responsavelQuery = `
          INSERT INTO tblresponsavelcliente (IdCliente, responsavel, Email, Ativo, DataInsercao)
          VALUES (@IdCliente, @responsavel, @email, @ativo, GETDATE())
        `;

        await responsavelRequest.query(responsavelQuery);
      }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Cliente cadastrado com sucesso', IdCliente });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Erro ao cadastrar cliente e responsáveis:', err.message);
    
    // Tratamento específico para erro de duplicidade
    if (err.message.includes('duplicate key') && err.message.includes('IX_tblcliente_Cliente')) {
      return res.status(400).json({
        success: false,
        errorMessage: `Cliente "${req.body.cliente}" já existe no sistema`,
        errorDetails: err.message
      });
    }
    
    res.status(500).json({
      success: false,
      errorMessage: 'Erro ao cadastrar cliente e responsáveis',
      errorDetails: err.message
    });
  } finally {
    await closeConnection();
  }
});

module.exports = router;
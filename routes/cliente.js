const express = require('express');
const sql = require('mssql'); // Importando mssql
const config = require('../conecta'); // Importando a configuração de conexão

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
    const result = await request.query('SELECT [IdCliente], [Cliente], [Ativo] FROM [monitor].[tblcliente]');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err.message);
    res.status(500).send('Erro ao buscar clientes');
  } finally {
    await closeConnection();
  }
});

// Rota para deletar um cliente
router.patch('/desativarCliente/:idCliente', connectToDatabase, async (req, res) => {
  const { idCliente } = req.params;

  try {
    const request = new sql.Request();
    request.input('idCliente', sql.Int, idCliente);

    const query = `
      DELETE FROM monitor.tblcliente 
      WHERE IdCliente = @idCliente
    `;

    const result = await request.query(query);

    // Verifica se algum registro foi afetado
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    res.status(200).json({ message: 'Cliente deletado com sucesso' });
  } catch (err) {
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

    const query = `
      SELECT IdCliente, Cliente, Ativo 
      FROM monitor.tblcliente 
      WHERE IdCliente = @idCliente
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).send('Cliente não encontrado');
    }

    const cliente = result.recordset[0];

    // Renderiza o formulário de edição com o HTML original
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
          <title>Ample Admin Template - The Ultimate Multipurpose admin template</title>
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
                          <h3><span class="fa-fw open-close"><i class="ti-menu hidden-xs"></i><i class="ti-close visible-xs"></i></span> <span class="hide-menu">Navigation</span></h3>
                      </div>
                      <ul class="nav" id="side-menu">
                          <li> <a class="waves-effect active"><i class="mdi mdi-table fa-fw"></i> <span class="hide-menu">Tabelas<span class="fa arrow"></span></span></a>
                              <ul class="nav nav-second-level">
                                  <li><a href="/cliente"><i class="ti-user fa-fw"></i><span class="hide-menu">Cliente</span></a></li>
                                  <li><a href="/tipoarquivo"><i class="ti-file fa-fw"></i><span class="hide-menu">Tipo Arquivo</span></a></li>
                                  <li><a href="/extensao"><i class="ti-file fa-fw"></i><span class="hide-menu">Extensão</span></a></li>
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
                                        <div class="form-group">
                                            <label for="cliente">Nome do Cliente</label>
                                            <input type="text" class="form-control" id="cliente" name="cliente" value="${cliente.Cliente}" readonly required>
                                        </div>
                                        <div class="form-group">
                                            <label for="cliente">Nome Novo do Cliente</label>
                                            <input type="text" class="form-control" id="clienteNovo" name="clienteNovo">
                                        </div>
                                        <div class="form-group">
                                            <label for="ativo">Ativo</label>
                                            <select class="form-control" id="ativo" name="ativo">
                                                <option value="1" ${cliente.Ativo === 1 ? 'selected' : ''}>Sim</option>
                                                <option value="0" ${cliente.Ativo === 0 ? 'selected' : ''}>Não</option>
                                            </select>
                                        </div>
                                        <button type="submit" class="btn btn-primary">Salvar Cliente</button>
                                      </form>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <footer class="footer text-center"> 2017 &copy; Ample Admin brought to you by themedesigner.in </footer>
              </div>
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
  const { IdCliente, cliente, clienteNovo, ativo } = req.body;

  try {
    const nomeFinal = clienteNovo && clienteNovo.trim() !== '' ? clienteNovo : cliente;

    const request = new sql.Request();
    request.input('nomeFinal', sql.VarChar, nomeFinal);
    request.input('ativo', sql.Int, ativo);
    request.input('IdCliente', sql.Int, IdCliente);

    const query = `
      UPDATE monitor.tblcliente 
      SET Cliente = @nomeFinal, Ativo = @ativo 
      WHERE IdCliente = @IdCliente
    `;

    await request.query(query);
    res.redirect('/cliente');
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err.message);
    res.status(500).send('Erro ao atualizar cliente');
  } finally {
    await closeConnection();
  }
});

// Rota para cadastrar um cliente
router.post('/cadastrocliente', connectToDatabase, async (req, res) => {
  const { cliente, ativo } = req.body;

  if (!cliente || !ativo) {
    return res.status(400).send('Dados inválidos');
  }

  try {
    const request = new sql.Request();
    request.input('cliente', sql.VarChar, cliente);
    request.input('ativo', sql.Int, ativo);

    const query = `
      INSERT INTO monitor.tblcliente (Cliente, Ativo, DataInsercao) 
      VALUES (@cliente, @ativo, GETDATE())
    `;

    await request.query(query);
    res.redirect('/cliente');
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err.message);
    res.status(500).send('Erro ao cadastrar cliente');
  } finally {
    await closeConnection();
  }
});

module.exports = router;
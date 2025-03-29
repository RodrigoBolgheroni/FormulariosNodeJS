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

// Rota para buscar dados dos tipos de arquivo
router.get('/tiposdearquivos', connectToDatabase, async (req, res) => {
  try {
    const request = new sql.Request();
    const result = await request.query('SELECT IdTipoArquivo, TipoArquivo, Descricao, Ativo FROM tbltipoarquivo');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar tipos de arquivo:', err.message);
    res.status(500).send('Erro ao buscar tipos de arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para desativar um Tipo Arquivo
router.patch('/desativarTipoArquivo/:idTipoArquivo', connectToDatabase, async (req, res) => {
  const { idTipoArquivo } = req.params;

  try {
    const request = new sql.Request();
    request.input('idTipoArquivo', sql.Int, idTipoArquivo);

    const query = `
      DELETE FROM tbltipoarquivo
      WHERE IdTipoArquivo = @idTipoArquivo
    `;

    const result = await request.query(query);

    // Verifica se algum registro foi afetado
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Tipo de arquivo não encontrado' });
    }

    res.status(200).json({ message: 'Tipo de arquivo desativado com sucesso' });
  } catch (err) {
    console.error('Erro ao desativar tipo de arquivo:', err.message);
    res.status(500).send('Erro ao desativar tipo de arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para exibir a página de edição do tipo de arquivo
router.get('/editarTipoArquivo/:idTipoArquivo', connectToDatabase, async (req, res) => {
  const { idTipoArquivo } = req.params;

  try {
    const request = new sql.Request();
    request.input('idTipoArquivo', sql.Int, idTipoArquivo);

    const query = `
      SELECT IdTipoArquivo, TipoArquivo, Descricao, Ativo 
      FROM tbltipoarquivo 
      WHERE IdTipoArquivo = @idTipoArquivo
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).send('Tipo de arquivo não encontrado');
    }

    const tipoArquivo = result.recordset[0];
    res.send(`      <!DOCTYPE html>
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
                        <h4 class="page-title">Editar Tipo Arquivo</h4>
                    </div>
                    <div class="col-lg-9 col-sm-8 col-md-8 col-xs-12">
                        <ol class="breadcrumb">
                            <li><a href="#">Tabelas</a></li>
                            <li class="active">Tipo Arquivos</li>
                        </ol>
                    </div>
                </div>

                <div class="row">
                    <div class="col-sm-12">
                        <div class="panel">
                            <div class="panel-heading">
                                Editar Tipo Arquivo
                            </div>
                            <div class="panel-body">
                                <form action="/editarTipoArquivo" method="POST">
                                <div class="form-group" style="display: none;">
                                  <label for="tipoArquivo">Id do Tipo Arquivo</label>
                                  <input type="text" class="form-control" id="IdTipoArquivo" name="IdTipoArquivo" value="${tipoArquivo.IdTipoArquivo}" readonly>
                                </div>

                                  <div class="form-group">
                                    <label for="tipoArquivo">Nome do Tipo Arquivo</label>
                                    <input type="text" class="form-control" id="tipoArquivo" name="tipoArquivo" value="${tipoArquivo.TipoArquivo}" readonly required>
                                  </div>
                                  <div class="form-group">
                                    <label for="tipoArquivoNovo">Nome Novo do Tipo Arquivo</label>
                                    <input type="text" class="form-control" id="tipoArquivoNovo" name="tipoArquivoNovo">
                                  </div>
                                  <div class="form-group">
                                    <label for="Descricao">Descrição do Tipo Arquivo</label>
                                    <input type="text" class="form-control" id="Descricao" name="Descricao" value="${tipoArquivo.Descricao}">
                                  </div>
                                  <div class="form-group">
                                    <label for="ativo">Ativo</label>
                                    <select class="form-control" id="ativo" name="ativo">
                                      <option value="1" ${tipoArquivo.Ativo === 1 ? 'selected' : ''}>Sim</option>
                                      <option value="0" ${tipoArquivo.Ativo === 0 ? 'selected' : ''}>Não</option>
                                    </select>
                                  </div>
                                  <button type="submit" class="btn btn-primary">Salvar Tipo Arquivo</button>
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

</html>`);
  } catch (err) {
    console.error('Erro ao buscar tipo de arquivo:', err.message);
    res.status(500).send('Erro ao buscar tipo de arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para editar um tipo de arquivo
router.post('/editarTipoArquivo', connectToDatabase, async (req, res) => {
  const { IdTipoArquivo, tipoArquivo, Descricao, tipoArquivoNovo, ativo } = req.body;

  try {
    const tipoArquivoFinal = tipoArquivoNovo && tipoArquivoNovo.trim() !== '' ? tipoArquivoNovo : tipoArquivo;

    const request = new sql.Request();
    request.input('tipoArquivoFinal', sql.VarChar, tipoArquivoFinal);
    request.input('Descricao', sql.VarChar, Descricao);
    request.input('ativo', sql.Int, ativo);
    request.input('IdTipoArquivo', sql.Int, IdTipoArquivo);

    const query = `
      UPDATE tbltipoarquivo
      SET TipoArquivo = @tipoArquivoFinal, Descricao = @Descricao, Ativo = @ativo
      WHERE IdTipoArquivo = @IdTipoArquivo
    `;

    await request.query(query);
    res.redirect('/tipoarquivo');
  } catch (err) {
    console.error('Erro ao atualizar tipo de arquivo:', err.message);
    res.status(500).send('Erro ao atualizar tipo de arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para cadastrar um tipo de arquivo
router.post('/cadastrotipodearquivo', connectToDatabase, async (req, res) => {
  const { tipodearquivo, descricao, ativo } = req.body;

  if (!tipodearquivo || !descricao || !ativo) {
    return res.status(400).send('Dados inválidos');
  }

  try {
    const request = new sql.Request();
    request.input('tipodearquivo', sql.VarChar, tipodearquivo);
    request.input('descricao', sql.VarChar, descricao);
    request.input('ativo', sql.Int, ativo);

    const query = `
      INSERT INTO tbltipoarquivo (TipoArquivo, Descricao, Ativo, DataInsercao)
      VALUES (@tipodearquivo, @descricao, @ativo, GETDATE())
    `;

    await request.query(query);
    res.redirect('/tipoarquivo');
  } catch (err) {
    console.error('Erro ao cadastrar tipo de arquivo:', err.message);
    res.status(500).send('Erro ao cadastrar tipo de arquivo');
  } finally {
    await closeConnection();
  }
});

module.exports = router;
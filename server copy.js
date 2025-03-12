const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sql = require('mssql'); // Para fazer a conexão com o banco de dados
const fs = require('fs');
const app = express();
const port = 3000;


// Configuração do body-parser para processar os dados de formulários
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos (CSS, JS, imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de conexão com o banco de dados SQL Server
const config = {
  user: 'ArkerBIQA',
  password: 'lrl1512Mj054*0LHb!Q',
  server: 'sqlarkerbigdata01.database.windows.net',
  database: 'ArkerBIQA',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

// Rota para exibir a página inicial (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'clientes.html'));
});

// Rota para exibir o formulário cliente.html
app.get('/cliente', (req, res) => {
  res.sendFile(path.join(__dirname, 'clientes.html'));
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





// Rota para desativar um cliente
app.patch('/desativarCliente/:nomeCliente', async (req, res) => {
  const nomeCliente = req.params.nomeCliente;

  try {
    await sql.connect(config);
    const query = `
      DELETE FROM monitor.tblcliente 
      WHERE IdCliente = '${nomeCliente}'
    `;
    await sql.query(query);
    res.redirect('/cliente');
  } finally {
    await sql.close();
  }
});

app.patch('/desativarArquivo/:nomeArquivo', async (req, res) => {
  const nomeArquivo = req.params.nomeArquivo;

  try {
    await sql.connect(config);

    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // 1. Deletar as regras associadas ao arquivo
      const deleteRegrasQuery = `
        DELETE FROM monitor.tblcliente_tipoarquivo_regra
        WHERE IdCliente_TipoArquivo = '${nomeArquivo}'
      `;
      await request.query(deleteRegrasQuery);

      // 2. Deletar o arquivo
      const deleteArquivoQuery = `
        DELETE FROM monitor.tblcliente_tipoarquivo
        WHERE IdCliente_TipoArquivo = '${nomeArquivo}'
      `;
      await request.query(deleteArquivoQuery);

      await transaction.commit(); // Confirma a transação
      res.redirect('/arquivo'); // Redireciona para a página de arquivos
    } catch (error) {
      await transaction.rollback(); // Reverte a transação em caso de erro
      throw error;
    }
  } catch (error) {
    console.error('Erro ao desativar arquivo:', error);
    res.status(500).send('Erro ao desativar arquivo!');
  } finally {
    await sql.close();
  }
});


// Rota para desativar uma regra
app.patch('/desativarRegra/:nomeRegra', async (req, res) => {
  const nomeRegra = req.params.nomeRegra;

  try {
    await sql.connect(config);
    const query = `
      DELETE FROM monitor.tblregra
      WHERE IdRegra = '${nomeRegra}'
    `;
    await sql.query(query);
    res.redirect('/regra');
  } finally {
    await sql.close();
  }
});

// Rota para desativar um Tipo Arquivo
app.patch('/desativarTipoArquivo/:nomeTipoArquivo', async (req, res) => {
  const nomeTipoArquivo = req.params.nomeTipoArquivo;

  try {
    await sql.connect(config);
    const query = `
      DELETE FROM monitor.tbltipoarquivo
      WHERE IdTipoArquivo = '${nomeTipoArquivo}'
    `;
    await sql.query(query);
    res.redirect('/tipoarquivo');
  } finally {
    await sql.close();
  }
});


// Rota para desativar uma Extensao
app.patch('/desativarExtensao/:nomeExtensao', async (req, res) => {
  const nomeExtensao = req.params.nomeExtensao;

  try {
    await sql.connect(config);
    const query = `
      DELETE FROM monitor.tblextensaoarquivo 
      WHERE IdExtensaoArquivo = '${nomeExtensao}'
    `;
    await sql.query(query);
    res.redirect('/extensao');
  } finally {
    await sql.close();
  }
});


// Rota para exibir a página de edição do cliente
app.get('/editarCliente/:nomeCliente', async (req, res) => {
  const nomeCliente = req.params.nomeCliente;

  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT IdCliente,Cliente, Ativo FROM monitor.tblcliente WHERE IdCliente = '${nomeCliente}'`);

    if (result.recordset.length === 0) {
      return res.status(404).send('Cliente não encontrado');
    }

    const cliente = result.recordset[0];

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
    await sql.close();
  }
});


// Rota para editar um cliente
app.post('/editarCliente', async (req, res) => {
  const { IdCliente,cliente, clienteNovo, ativo } = req.body;

  try {
    // Se o nome novo estiver vazio, mantém o nome antigo
    const nomeFinal = (clienteNovo && clienteNovo.trim() !== '') ? clienteNovo : cliente;

    await sql.connect(config);
    const query = `UPDATE monitor.tblcliente 
                   SET Cliente = '${nomeFinal}', Ativo = '${ativo}'
                   WHERE IdCliente = '${IdCliente}'`;
    await sql.query(query);
    res.redirect('/cliente');
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err.message);
    res.status(500).send('Erro ao atualizar cliente');
  } finally {
    await sql.close();
  }
});






























// Rota para exibir a página de edição do arquivo
app.get('/editarArquivo/:idArquivo', async (req, res) => {
  const idArquivo = req.params.idArquivo;

  try {
    await sql.connect(config);

    // Busca os dados do arquivo
    const arquivoQuery = `
      SELECT 
        cta.[IdCliente_TipoArquivo],
        c.[IdCliente],  
        c.[Cliente], 
        ta.[IdTipoArquivo], 
        ta.[TipoArquivo], 
        ea.[IdExtensaoArquivo], 
        ea.[ExtensaoArquivo], 
        cta.[Encoding], 
        cta.[IsHeader], 
        cta.[Header], 
        cta.[Chave], 
        cta.[Ativo] 
      FROM [monitor].[tblcliente_tipoarquivo] cta 
      LEFT JOIN [monitor].[tblcliente] c ON cta.[IdCliente] = c.[IdCliente] 
      LEFT JOIN [monitor].[tbltipoarquivo] ta ON cta.[IdTipoArquivo] = ta.[IdTipoArquivo] 
      LEFT JOIN [monitor].[tblextensaoarquivo] ea ON cta.[IdExtensaoArquivo] = ea.[IdExtensaoArquivo]
      WHERE cta.[IdCliente_TipoArquivo] = '${idArquivo}'
    `;
    const arquivoResult = await sql.query(arquivoQuery);

    if (arquivoResult.recordset.length === 0) {
      return res.status(404).send('Arquivo não encontrado');
    }

    const arquivo = arquivoResult.recordset[0];

    // Busca as regras associadas ao arquivo
    const regrasQuery = `
      SELECT 
        IdRegra, 
        TipoDeDado, 
        DescricaoCampo, 
        Obrigatorio 
      FROM monitor.tblcliente_tipoarquivo_regra 
      WHERE IdCliente_TipoArquivo = '${idArquivo}'
    `;
    const regrasResult = await sql.query(regrasQuery);
    const regras = regrasResult.recordset;

    // Busca clientes, tipos de arquivo e extensões ativos
    const clientesQuery = "SELECT IdCliente, Cliente FROM monitor.tblcliente WHERE Ativo = 1";
    const tiposArquivoQuery = "SELECT IdTipoArquivo, TipoArquivo FROM monitor.tbltipoarquivo WHERE Ativo = 1";
    const extensoesQuery = "SELECT IdExtensaoArquivo, ExtensaoArquivo FROM monitor.tblextensaoarquivo WHERE Ativo = 1";

    const [clientesResult, tiposArquivoResult, extensoesResult] = await Promise.all([
      sql.query(clientesQuery),
      sql.query(tiposArquivoQuery),
      sql.query(extensoesQuery)
    ]);

    const clientes = clientesResult.recordset;
    const tiposArquivo = tiposArquivoResult.recordset;
    const extensoes = extensoesResult.recordset;

    // Renderiza a página de edição
    // Renderiza a página de edição
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
      <title>Editar Arquivo</title>
      <link href="../bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="../plugins/bower_components/sidebar-nav/dist/sidebar-nav.min.css" rel="stylesheet">
      <link href="../css/style.css" rel="stylesheet">
          <!-- color CSS -->
    <link href="../css/colors/gray-dark.css" id="theme" rel="stylesheet">
  </head>
  <body class="fix-header">
      <div id="wrapper">
              <nav class="navbar navbar-default navbar-static-top m-b-0">
            <div class="navbar-header">
                <div class="top-left-part">
                    <a class="logo" href="index.html">
                        <span class="hidden-xs">
                            <img src="/plugins/images/logo.webp" alt="home" class="dark-logo" width="200px">
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
                          <h4 class="page-title">Editar Arquivo</h4>
                      </div>
                  </div>
                  <div class="row">
                      <div class="col-sm-12">
                          <div class="panel">
                              <div class="panel-heading">
                                  Editar Arquivo
                              </div>
                              <div class="panel-body">
                                  <form action="/editarArquivo" id="formArquivo" method="POST">
                                      <input type="hidden" name="IdCliente_TipoArquivo" value="${arquivo.IdCliente_TipoArquivo}">
                                      
                                      <!-- Cliente -->
                                      <div class="form-group col-md-4">
                                          <label for="cliente">Cliente</label>
                                          <select class="form-control" id="IdCliente" name="IdCliente" required>
                                              ${clientes.map(cliente => `
                                                  <option value="${cliente.IdCliente}" ${cliente.IdCliente === arquivo.IdCliente ? 'selected' : ''}>
                                                      ${cliente.Cliente}
                                                  </option>
                                              `).join('')}
                                          </select>
                                      </div>
  
                                      <!-- Tipo de Arquivo -->
                                      <div class="form-group col-md-4">
                                          <label for="tipoArquivo">Tipo Arquivo</label>
                                          <select class="form-control" id="tipoArquivo" name="IdTipoArquivo" required>
                                              ${tiposArquivo.map(tipo => `
                                                  <option value="${tipo.IdTipoArquivo}" ${tipo.IdTipoArquivo === arquivo.IdTipoArquivo ? 'selected' : ''}>
                                                      ${tipo.TipoArquivo}
                                                  </option>
                                              `).join('')}
                                          </select>
                                      </div>
  
                                      <!-- Extensão -->
                                      <div class="form-group col-md-4">
                                          <label for="extensao">Extensão</label>
                                          <select class="form-control" id="extensao" name="IdExtensaoArquivo" required>
                                              ${extensoes.map(extensao => `
                                                  <option value="${extensao.IdExtensaoArquivo}" ${extensao.IdExtensaoArquivo === arquivo.IdExtensaoArquivo ? 'selected' : ''}>
                                                      ${extensao.ExtensaoArquivo}
                                                  </option>
                                              `).join('')}
                                          </select>
                                      </div>
  
                                      <!-- Outros campos -->
                                      <div class="form-group col-md-6">
                                          <label for="encoding">Encoding</label>
                                          <select class="form-control" id="encoding" name="Encoding" required>
                                              <option value="UTF-8" ${arquivo.Encoding === 'UTF-8' ? 'selected' : ''}>UTF-8</option>
                                                                                            <option value="windows-1252" ${arquivo.Encoding === 'windows-1252' ? 'selected' : ''}>windows-1252</option>
                                          </select>
                                      </div>
                                      <div class="form-group col-md-6">
                                          <label for="isHeader">IsHeader</label>
                                          <select class="form-control" id="isHeader" name="IsHeader" required>
                                              <option value="1" ${arquivo.IsHeader === 1 ? 'selected' : ''}>Sim</option>
                                              <option value="0" ${arquivo.IsHeader === 0 ? 'selected' : ''}>Não</option>
                                          </select>
                                      </div>
                                      <div class="form-group col-md-12">
                                          <label for="header">Header</label>
                                          <input type="text" class="form-control" id="header" name="Header" value="${arquivo.Header}" required>
                                      </div>
                                      <div class="form-group col-md-6">
                                          <label for="chave">Chave</label>
                                          <input type="text" class="form-control" id="chave" name="Chave" value="${arquivo.Chave}" required>
                                      </div>
                                      <div class="form-group col-md-6">
                                          <label for="ativo">Ativo</label>
                                          <select class="form-control" id="ativo" name="Ativo" required>
                                              <option value="1" ${arquivo.Ativo === 1 ? 'selected' : ''}>Sim</option>
                                              <option value="0" ${arquivo.Ativo === 0 ? 'selected' : ''}>Não</option>
                                          </select>
                                      </div>  
                                      <input type="hidden" id="regrasJson" name="regrasJson">
                                      <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                                  </form>
                              </div>
                          </div>
                      </div>
                  </div>
                                                        <!-- Regras -->
                                      <div class="row">
                                          <div class="col-sm-12">
                                              <div class="panel">
                                                  <div class="panel-heading">
                                                      Regras do Arquivo
                                                      <button type="button" id="btnRedefinirSchema" class="btn btn-primary" style="margin-left: 20px;">
                                                          <i class="ti-reload"></i> Redefinir Schema
                                                      </button>
                                                  </div>
                                                  <div class="panel-body" id="regra-panel">
                                                      <form id="formRegra">
                                                          <div class="row">
                                                              <div class="col-md-12">
                                                                  <div class="row">
                                                                      <div class="col-md-3">
                                                                          <h5>Nome Campo</h5>
                                                                      </div>
                                                                      <div class="col-md-3">
                                                                          <h5>Tipo De Dado</h5>
                                                                      </div>
                                                                      <div class="col-md-3">
                                                                          <h5>Regra</h5>
                                                                      </div>
                                                                      <div class="col-md-3">
                                                                          <h5>Obrigatório</h5>
                                                                      </div>
                                                                  </div>
                                                                  <hr>
                                                              </div>
                                                          </div>
                                                          ${regras.map((regra, index) => `
                                                              <div class="row">
                                                                  <div class="col-md-3">
                                                                      <input type="text" class="form-control" name="DescricaoCampo${index}" value="${regra.DescricaoCampo}" readonly>
                                                                  </div>
                                                                  <div class="col-md-3">
                                                                      <select class="form-control" name="TipoDeDado${index}">
                                                                          <option value="Texto" ${regra.TipoDeDado === 'Texto' ? 'selected' : ''}>Texto</option>
                                                                          <option value="Número" ${regra.TipoDeDado === 'Número' ? 'selected' : ''}>Número</option>
                                                                          <option value="Data" ${regra.TipoDeDado === 'Data' ? 'selected' : ''}>Data</option>
                                                                          <option value="Booleano" ${regra.TipoDeDado === 'Booleano' ? 'selected' : ''}>Booleano</option>
                                                                      </select>
                                                                  </div>
                                                                  <div class="col-md-3">
                                                                      <select class="form-control" name="Regra${index}">
                                                                          <!-- Opções de regras serão preenchidas dinamicamente via JavaScript -->
                                                                      </select>
                                                                  </div>
                                                                  <div class="col-md-3">
                                                                      <input type="checkbox" name="Obrigatorio${index}" ${regra.Obrigatorio === 1 ? 'checked' : ''}>
                                                                  </div>
                                                              </div>
                                                          `).join('')}
                                                      </form>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
              </div>
          </div>
      </div>
  
<script src="../plugins/bower_components/jquery/dist/jquery.min.js"></script>
<script>
    // Função para carregar as regras do banco de dados
    async function carregarRegras() {
        try {
            const response = await fetch('/regras');
            const regras = await response.json();
            return regras.filter(regra => regra.Ativo === 1); // Filtra apenas regras ativas
        } catch (error) {
            console.error('Erro ao carregar regras:', error);
            return [];
        }
    }

    // Função para preencher as opções de regras
    async function preencherRegras() {
        const regras = await carregarRegras();
        document.querySelectorAll('[name^="Regra"]').forEach((select, index) => {
            regras.forEach(regra => {
                const option = document.createElement('option');
                option.value = regra.IdRegra;
                option.textContent = regra.Regra;
                select.appendChild(option);
            });
        });
    }

    // Função para gerar os inputs de regras dinamicamente
    async function gerarInputsRegra() {
        const formRegra = document.getElementById('formRegra');
        const headerInput = document.getElementById('header');

        // Verifica se os elementos existem
        if (!formRegra || !headerInput) {
            console.error('Elementos formRegra ou headerInput não encontrados no DOM.');
            return;
        }

        // Verifica se o campo header está vazio
        if (!headerInput.value.trim()) {
            alert('O campo "Header" está vazio. Insira os valores separados por vírgula.');
            return;
        }

        // Limpa o conteúdo atual do formulário de regras (exceto o título e a linha)
        const tituloELinha = formRegra.querySelector('.row:first-child');
        if (!tituloELinha) {
            console.error('Elemento .row:first-child não encontrado dentro de formRegra.');
            return;
        }

        formRegra.innerHTML = ''; // Limpa todo o conteúdo
        formRegra.appendChild(tituloELinha); // Adiciona o título e a linha de volta

        // Separa os valores do header por vírgula
        const headerValues = headerInput.value.split(',');

        // Verifica se há valores válidos no header
        if (headerValues.length === 0 || headerValues.every(val => !val.trim())) {
            alert('O campo "Header" não contém valores válidos. Insira os valores separados por vírgula.');
            return;
        }

        // Carrega as regras do banco de dados
        const regras = await carregarRegras();

        // Itera sobre os valores do header para criar os inputs
        headerValues.forEach((campo, index) => {
            const row = document.createElement('div');
            row.className = 'row';

            // Input para o Nome do Campo
            const colNomeCampo = document.createElement('div');
            colNomeCampo.className = 'form-group col-md-3';
            const inputNomeCampo = document.createElement('input');
            inputNomeCampo.type = 'text';
            inputNomeCampo.className = 'form-control';
            inputNomeCampo.value = campo.trim();
            inputNomeCampo.required = true;
            inputNomeCampo.readOnly = true;
            colNomeCampo.appendChild(inputNomeCampo);

            // Select para o Tipo de Dado
            const colTipoDado = document.createElement('div');
            colTipoDado.className = 'form-group col-md-3';
            const selectTipoDado = document.createElement('select');
            selectTipoDado.className = 'form-control';
            selectTipoDado.required = true;
            ['Texto', 'Número', 'Data', 'Booleano'].forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo;
                option.textContent = tipo;
                selectTipoDado.appendChild(option);
            });
            colTipoDado.appendChild(selectTipoDado);

            // Select para a Regra
            const colRegra = document.createElement('div');
            colRegra.className = 'form-group col-md-3';
            const selectRegra = document.createElement('select');
            selectRegra.className = 'form-control';
            selectRegra.name = 'Regra';
            selectRegra.required = true;
            regras.forEach(regra => {
                const option = document.createElement('option');
                option.value = regra.IdRegra;
                option.textContent = regra.Regra;
                selectRegra.appendChild(option);
            });
            colRegra.appendChild(selectRegra);

            // Checkbox para Obrigatório
            const colObrigatorio = document.createElement('div');
            colObrigatorio.className = 'form-group col-md-3';
            const checkboxObrigatorio = document.createElement('input');
            checkboxObrigatorio.type = 'checkbox';
            checkboxObrigatorio.name = 'Obrigatorio';
            checkboxObrigatorio.className = 'form-check-input';
            colObrigatorio.appendChild(checkboxObrigatorio);

            // Adiciona as colunas à linha
            row.appendChild(colNomeCampo);
            row.appendChild(colTipoDado);
            row.appendChild(colRegra);
            row.appendChild(colObrigatorio);

            // Adiciona a linha ao formulário de regras
            formRegra.appendChild(row);
        });
    }

    // Adiciona o evento ao botão "Redefinir Schema"
    document.addEventListener('DOMContentLoaded', () => {
        const btnRedefinirSchema = document.getElementById('btnRedefinirSchema');
        if (btnRedefinirSchema) {
            btnRedefinirSchema.addEventListener('click', gerarInputsRegra);
        } else {
            console.error('Botão btnRedefinirSchema não encontrado no DOM.');
        }

        // Preenche as regras ao carregar a página
        preencherRegras();
    });
</script>
<script>
document.getElementById('formArquivo').addEventListener('submit', function (e) {
    e.preventDefault(); // Evita o envio padrão do formulário

    const regras = [];
    const regraInputs = document.querySelectorAll('#formRegra .row');

    regraInputs.forEach((row) => {
        // Seleciona os elementos corretamente
        const inputCampo = row.querySelector('input[type="text"]');
        const selectTipoDado = row.querySelector('select'); 
        const selectRegra = row.querySelector('select[name="Regra"]'); 
        const checkboxObrigatorio = row.querySelector('input[type="checkbox"]');

        if (!inputCampo || !selectTipoDado || !selectRegra || !checkboxObrigatorio) {
            console.error('Elementos não encontrados na linha:', row);
            return;
        }

        regras.push({
            DescricaoCampo: inputCampo.value,
            TipoDeDado: selectTipoDado.value,
            IdRegra: selectRegra.value,
            Obrigatorio: checkboxObrigatorio.checked ? 1 : 0
        });
    });

    const regrasJson = JSON.stringify(regras);
    document.getElementById('regrasJson').value = regrasJson;

    console.log('Regras JSON:', regrasJson);

    this.submit();
});

</script>
  </body>
  </html>
  `);
  } catch (err) {
    console.error('Erro ao buscar arquivo:', err.message);
    res.status(500).send('Erro ao buscar arquivo');
  } finally {
    await sql.close();
  }
});



















app.post('/editarArquivo', async (req, res) => {
  const {
      IdCliente_TipoArquivo,
      IdCliente,
      IdTipoArquivo,
      IdExtensaoArquivo,
      Encoding,
      IsHeader,
      Header,
      Chave,
      Ativo,
      regrasJson
  } = req.body;

  try {
      const regras = JSON.parse(regrasJson);

      await sql.connect(config);
      const request = new sql.Request();
      request.input('IdCliente', sql.Int, IdCliente);
      request.input('IdTipoArquivo', sql.Int, IdTipoArquivo);
      request.input('IdExtensaoArquivo', sql.Int, IdExtensaoArquivo);
      request.input('Encoding', sql.NVarChar, Encoding);
      request.input('IsHeader', sql.Bit, IsHeader);
      request.input('Header', sql.NVarChar, Header);
      request.input('Chave', sql.NVarChar, Chave);
      request.input('Ativo', sql.Bit, Ativo);
      request.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);

      const updateArquivoQuery = `
          UPDATE monitor.tblcliente_tipoarquivo
          SET 
              IdCliente = @IdCliente,
              IdTipoArquivo = @IdTipoArquivo,
              IdExtensaoArquivo = @IdExtensaoArquivo,
              Encoding = @Encoding,
              IsHeader = @IsHeader,
              Header = @Header,
              Chave = @Chave,
              Ativo = @Ativo
          WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo
      `;

      await request.query(updateArquivoQuery);

      // Passo 1: Obter as regras existentes no banco
      const existingRegrasQuery = `
          SELECT DescricaoCampo FROM monitor.tblcliente_tipoarquivo_regra
          WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo
      `;
      const existingRegrasResult = await request.query(existingRegrasQuery);
      const existingRegras = existingRegrasResult.recordset.map(item => item.DescricaoCampo);

      // Passo 2: Processar as novas regras
      for (let regra of regras) {
          const { DescricaoCampo, TipoDeDado, IdRegra, Obrigatorio } = regra;

          // Verificar se a regra já existe
          if (existingRegras.includes(DescricaoCampo)) {
              // Atualiza a regra existente
              const updateRegraQuery = `
                  UPDATE monitor.tblcliente_tipoarquivo_regra
                  SET 
                      TipoDeDado = @TipoDeDado,
                      IdRegra = @IdRegra,
                      Obrigatorio = @Obrigatorio
                  WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo AND DescricaoCampo = @DescricaoCampo
              `;
              const requestRegra = new sql.Request();
              requestRegra.input('TipoDeDado', sql.NVarChar, TipoDeDado);
              requestRegra.input('IdRegra', sql.Int, IdRegra);
              requestRegra.input('Obrigatorio', sql.Bit, Obrigatorio);
              requestRegra.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);
              requestRegra.input('DescricaoCampo', sql.NVarChar, DescricaoCampo);

              await requestRegra.query(updateRegraQuery);
              console.log(`Regra atualizada: ${DescricaoCampo}`);
          } else {
              // Adiciona uma nova regra
              const insertRegraQuery = `
              INSERT INTO monitor.tblcliente_tipoarquivo_regra (IdCliente_TipoArquivo, DescricaoCampo, TipoDeDado, IdRegra, Obrigatorio, DataInsercao)
              VALUES (@IdCliente_TipoArquivo, @DescricaoCampo, @TipoDeDado, @IdRegra, @Obrigatorio, GETDATE())  -- Adiciona a data e hora atual
              `;

              const requestInsert = new sql.Request();
              requestInsert.input('DescricaoCampo', sql.NVarChar, DescricaoCampo);
              requestInsert.input('TipoDeDado', sql.NVarChar, TipoDeDado);
              requestInsert.input('IdRegra', sql.Int, IdRegra);
              requestInsert.input('Obrigatorio', sql.Bit, Obrigatorio);
              requestInsert.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);

              await requestInsert.query(insertRegraQuery);
              console.log(`Regra adicionada: ${DescricaoCampo}`);
          }
      }

      // Passo 3: Remover regras que não estão mais na lista
      for (let descricaoCampo of existingRegras) {
          if (!regras.some(regra => regra.DescricaoCampo === descricaoCampo)) {
              // Remover regra que não existe mais
              const deleteRegraQuery = `
                  DELETE FROM monitor.tblcliente_tipoarquivo_regra
                  WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo AND DescricaoCampo = @DescricaoCampo
              `;
              const requestDelete = new sql.Request();
              requestDelete.input('DescricaoCampo', sql.NVarChar, descricaoCampo);
              requestDelete.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);

              await requestDelete.query(deleteRegraQuery);
              console.log(`Regra removida: ${descricaoCampo}`);
          }
      }

      res.redirect('/arquivo'); // Redireciona para a página de arquivos
  } catch (err) {
      console.error('Erro ao atualizar arquivo:', err.message);
      res.status(500).send('Erro ao atualizar arquivo');
  } finally {
      await sql.close();
  }
});


























app.get('/editarExtensao/:nomeExtensao', async (req, res) => {
  const nomeExtensao = req.params.nomeExtensao;

  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT IdExtensaoArquivo,ExtensaoArquivo, Ativo FROM monitor.tblextensaoarquivo WHERE IdExtensaoArquivo = '${nomeExtensao}'`);

    if (result.recordset.length === 0) {
      return res.status(404).send('Extensão não encontrado');
    }

    const extensao = result.recordset[0];

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
                        <h4 class="page-title">Editar Extensão</h4>
                    </div>
                    <div class="col-lg-9 col-sm-8 col-md-8 col-xs-12">
                        <ol class="breadcrumb">
                            <li><a href="#">Tabelas</a></li>
                            <li class="active">Extensões</li>
                        </ol>
                    </div>
                </div>

                <div class="row">
                    <div class="col-sm-12">
                        <div class="panel">
                            <div class="panel-heading">
                                Editar Extensao
                            </div>
                            <div class="panel-body">
                                <form action="/editarExtensao" method="POST">
                                <div class="form-group" style="display: none;">
                                  <label for="extensao">Id da Extensao</label>
                                  <input type="text" class="form-control" id="Idextensao" name="Idextensao" value="${extensao.IdExtensaoArquivo}" readonly>
                                </div>

                                  <div class="form-group">
                                  
                                    <label for="extensao">Nome da Extensao</label>
                                    <input type="text" class="form-control" id="extensao" name="extensao" value="${extensao.ExtensaoArquivo}" readonly required>
                                  </div>
                                  <div class="form-group">
                                    <label for="extensaoNovo">Nome Novo da Extensão</label>
                                    <input type="text" class="form-control" id="extensaoNovo" name="extensaoNovo">
                                  </div>
                                  <div class="form-group">
                                    <label for="ativo">Ativo</label>
                                    <select class="form-control" id="ativo" name="ativo">
                                      <option value="1" ${extensao.Ativo === 1 ? 'selected' : ''}>Sim</option>
                                      <option value="0" ${extensao.Ativo === 0 ? 'selected' : ''}>Não</option>
                                    </select>
                                  </div>
                                  <button type="submit" class="btn btn-primary">Salvar Extensao</button>
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
    console.error('Erro ao buscar extensão:', err.message);
    res.status(500).send('Erro ao buscar extensão');
  } finally {
    await sql.close();
  }
});


app.post('/editarExtensao', async (req, res) => {
  const { Idextensao,extensao, extensaoNovo, ativo } = req.body;

  try {
    const extensaoFinal = (extensaoNovo && extensaoNovo.trim() !== '') ? extensaoNovo : extensao;

    await sql.connect(config);
    const query = `UPDATE monitor.tblextensaoarquivo
                   SET ExtensaoArquivo = '${extensaoFinal}', Ativo = '${ativo}'
                   WHERE IdExtensaoArquivo= '${Idextensao}'`;
    await sql.query(query);
    res.redirect('/extensao');
  } catch (err) {
    console.error('Erro ao atualizar extensão:', err.message);
    res.status(500).send('Erro ao atualizar extensão');
  } finally {
    await sql.close();
  }
});
















app.get('/editarTipoArquivo/:nomeTipoArquivo', async (req, res) => {
  const nomeTipoArquivo = req.params.nomeTipoArquivo;

  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT IdTipoArquivo, TipoArquivo,Descricao, Ativo FROM monitor.tbltipoarquivo WHERE IdTipoArquivo = '${nomeTipoArquivo}'`);

    if (result.recordset.length === 0) {
      return res.status(404).send('Tipo Arquivo não encontrado');
    }

    const tipoArquivo = result.recordset[0];

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

</html>
    `);
  } catch (err) {
    console.error('Erro ao buscar tipo arquivo:', err.message);
    res.status(500).send('Erro ao buscar tipo arquivo');
  } finally {
    await sql.close();
  }
});



app.post('/editarTipoArquivo', async (req, res) => {
  const { IdTipoArquivo, tipoArquivo,Descricao, tipoArquivoNovo, ativo } = req.body;

  try {
    const tipoArquivoFinal = (tipoArquivoNovo && tipoArquivoNovo.trim() !== '') ? tipoArquivoNovo : tipoArquivo;

    await sql.connect(config);
    const query = `UPDATE monitor.tbltipoarquivo
                   SET TipoArquivo = '${tipoArquivoFinal}',Descricao = '${Descricao}', Ativo = '${ativo}'
                   WHERE IdTipoArquivo = '${IdTipoArquivo}'`;
    await sql.query(query);
    res.redirect('/tipoarquivo');
  } catch (err) {
    console.error('Erro ao atualizar tipo arquivo:', err.message);
    res.status(500).send('Erro ao atualizar tipo arquivo');
  } finally {
    await sql.close();
  }
});
















app.get('/editarRegra/:nomeRegra', async (req, res) => {
  const nomeRegra = req.params.nomeRegra;

  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT IdRegra, Regra,Descricao, Ativo FROM monitor.tblregra WHERE IdRegra = '${nomeRegra}'`);

    if (result.recordset.length === 0) {
      return res.status(404).send('Regra não encontrado');
    }

    const regra = result.recordset[0];

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
                        <h4 class="page-title">Editar Regra</h4>
                    </div>
                    <div class="col-lg-9 col-sm-8 col-md-8 col-xs-12">
                        <ol class="breadcrumb">
                            <li><a href="#">Tabelas</a></li>
                            <li class="active">Regra</li>
                        </ol>
                    </div>
                </div>

                <div class="row">
                    <div class="col-sm-12">
                        <div class="panel">
                            <div class="panel-heading">
                                Editar Regra
                            </div>
                            <div class="panel-body">
                                <form action="/editarRegra" method="POST">
                                <div class="form-group" style="display: none;">
                                  <label>Id da Regra</label>
                                  <input type="text" class="form-control" id="IdRegra" name="IdRegra" value="${regra.IdRegra}" readonly>
                                </div>

                                  <div class="form-group">
                                    <label for="regra">Nome da Regra</label>
                                    <input type="text" class="form-control" id="regra" name="regra" value="${regra.Regra}" readonly required>
                                  </div>
                                  <div class="form-group">
                                    <label for="regraNovo">Nome Novo da Regra</label>
                                    <input type="text" class="form-control" id="regraNovo" name="regraNovo">
                                  </div>
                                  <div class="form-group">
                                    <label for="Descricao">Descrição da Regra</label>
                                    <input type="text" class="form-control" id="Descricao" name="Descricao" value="${regra.Descricao}">
                                  </div>
                                  <div class="form-group">
                                    <label for="ativo">Ativo</label>
                                    <select class="form-control" id="ativo" name="ativo">
                                      <option value="1" ${regra.Ativo === 1 ? 'selected' : ''}>Sim</option>
                                      <option value="0" ${regra.Ativo === 0 ? 'selected' : ''}>Não</option>
                                    </select>
                                  </div>
                                  <button type="submit" class="btn btn-primary">Salvar Regra</button>
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
    console.error('Erro ao buscar regra:', err.message);
    res.status(500).send('Erro ao buscar regra');
  } finally {
    await sql.close();
  }
});



app.post('/editarRegra', async (req, res) => {
  const { IdRegra, regra,Descricao, regraNovo, ativo } = req.body;

  try {
    const regraFinal = (regraNovo && regraNovo.trim() !== '') ? regraNovo : regra;

    await sql.connect(config);
    const query = `UPDATE monitor.tblregra
                   SET Regra = '${regraFinal}',Descricao = '${Descricao}', Ativo = '${ativo}'
                   WHERE IdRegra = '${IdRegra}'`;
    await sql.query(query);
    res.redirect('/regra');
  } catch (err) {
    console.error('Erro ao atualizar regra:', err.message);
    res.status(500).send('Erro ao atualizar regra');
  } finally {
    await sql.close();
  }
});







// Rota para processar o formulário de EXTENSÃO e inserir no banco
app.post('/cadastroextensao', async (req, res) => {
  const { extensao, ativo } = req.body;

  try {
    await sql.connect(config);
    const query = `INSERT INTO monitor.tblextensaoarquivo (extensaoarquivo, ativo, DataInsercao) 
                   VALUES ('${extensao}', ${ativo}, GETDATE())`;
    await sql.query(query);
    res.redirect('/extensao');
  } catch (err) {
    console.error('Erro ao inserir no banco de dados:', err.message);
    res.status(500).send('Erro ao cadastrar extensão!');
  } finally {
    await sql.close();
  }
});

// Rota para processar o formulário de TIPO DE ARQUIVO e inserir no banco
app.post('/cadastrotipodearquivo', async (req, res) => {
  const { tipodearquivo, descricao, ativo } = req.body;

  try {
    await sql.connect(config);
    const query = `INSERT INTO monitor.tbltipoarquivo (TipoArquivo, Descricao, ativo, DataInsercao)
                   VALUES ('${tipodearquivo}', '${descricao}', ${ativo}, GETDATE())`;
    await sql.query(query);
    res.redirect('/tipoarquivo');
  } catch (err) {
    console.error('Erro ao inserir no banco de dados:', err.message);
    res.status(500).send('Erro ao cadastrar tipo de arquivo!');
  } finally {
    await sql.close();
  }
});

// Rota para processar o formulário de CLIENTE e inserir no banco
app.post('/cadastrocliente', async (req, res) => {
  const { cliente, ativo } = req.body;

  try {
    await sql.connect(config);
    const query = `INSERT INTO monitor.tblcliente (Cliente, Ativo, DataInsercao) 
                   VALUES ('${cliente}', ${ativo}, GETDATE())`;
    await sql.query(query);
    res.redirect('/cliente'); // Redireciona para a página de clientes após a inserção
  } catch (err) {
    console.error('Erro ao inserir no banco de dados:', err.message);
    res.status(500).send('Erro ao cadastrar cliente!');
  } finally {
    await sql.close();
  }
});

// Rota para processar o formulário de REGRA e inserir no banco
app.post('/cadastroregra', async (req, res) => {
  const { regra,descricao, ativo } = req.body;
  

  try {
    await sql.connect(config);
    const query = `INSERT INTO monitor.tblregra (Regra, Descricao,Ativo, DataInsercao) 
                   VALUES ('${regra}',${descricao}, ${ativo}, GETDATE())`;
    console.log(query)
    await sql.query(query);
    res.redirect('/regra');
  } catch (err) {
    console.error('Erro ao inserir no banco de dados:', err.message);
    res.status(500).send('Erro ao cadastrar regra!');
  } finally {
    await sql.close();
  }
});

// Rota para processar o formulário de ARQUIVOS e inserir no banco
app.post('/cadastroarquivo', async (req, res) => {
  const { IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, regrasJson } = req.body;

  console.log('Regras JSON recebido:', regrasJson)

  try {
      await sql.connect(config);

      // 1. Insere os dados do arquivo
      const queryArquivo = `
          INSERT INTO monitor.tblcliente_tipoarquivo 
          (IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, DataInsercao) 
          VALUES (${IdCliente}, ${IdTipoArquivo}, ${IdExtensaoArquivo}, '${Encoding}', ${IsHeader}, '${Header}', '${Chave}', ${Ativo}, GETDATE());
          SELECT SCOPE_IDENTITY() AS IdCliente_TipoArquivo;`;

      const resultArquivo = await sql.query(queryArquivo);
      const IdCliente_TipoArquivo = resultArquivo.recordset[0].IdCliente_TipoArquivo;

      // 2. Insere as regras
      const regras = JSON.parse(regrasJson);
      for (const regra of regras) {
          const queryRegra = `
              INSERT INTO monitor.tblcliente_tipoarquivo_regra 
              (IdCliente_TipoArquivo, IdRegra, TipoDeDado, DescricaoCampo, Obrigatorio, DataInsercao) 
              VALUES (${IdCliente_TipoArquivo}, ${regra.IdRegra}, '${regra.TipoDeDado}', '${regra.DescricaoCampo}', ${regra.Obrigatorio}, GETDATE());`;

          await sql.query(queryRegra);
      }

      res.redirect('/arquivo');
  } catch (err) {
      console.error('Erro ao inserir no banco de dados:', err.message);
      res.status(500).send('Erro ao cadastrar arquivo!');
  } finally {
      await sql.close();
  }
});



// Rota para buscar dados dos clientes
app.get('/clientes', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT [IdCliente],[Cliente],[Ativo] FROM [monitor].[tblcliente]');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err.message);
    res.status(500).send('Erro ao buscar clientes');
  } finally {
    await sql.close();
  }
});


// Rota para buscar dados da regra
app.get('/regras', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT [IdRegra],[Regra],[Descricao],[Ativo] FROM [monitor].[tblregra]');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar Regra:', err.message);
    res.status(500).send('Erro ao buscar Regra');
  } finally {
    await sql.close();
  }
});

// Rota para buscar dados do arquivo
app.get('/arquivos', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT 
    cta.[IdCliente_TipoArquivo],
    c.[IdCliente],  
    c.[Cliente], 
    ta.[IdTipoArquivo], 
    ta.[TipoArquivo], 
    ea.[IdExtensaoArquivo], 
    ea.[ExtensaoArquivo], 
    cta.[Encoding], 
    cta.[IsHeader], 
    cta.[Header], 
    cta.[Chave], 
    cta.[Ativo] 
FROM [monitor].[tblcliente_tipoarquivo] cta 
LEFT JOIN [monitor].[tblcliente] c ON cta.[IdCliente] = c.[IdCliente] 
LEFT JOIN [monitor].[tbltipoarquivo] ta ON cta.[IdTipoArquivo] = ta.[IdTipoArquivo] 
LEFT JOIN [monitor].[tblextensaoarquivo] ea ON cta.[IdExtensaoArquivo] = ea.[IdExtensaoArquivo];`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar Regra:', err.message);
    res.status(500).send('Erro ao buscar Regra');
  } finally {
    await sql.close();
  }
});


// Rota para buscar dados do arquivo
app.get('/regrasarquivos', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        r.[IdCliente_Tipoarquivo_Regra],
        r.[IdCliente_TipoArquivo],
        r.[IdRegra],
        rg.[Regra],  -- Nome da regra, vindo da tabela tblregra
        r.[TipoDeDado],
        r.[DescricaoCampo],
        r.[Obrigatorio],
        r.[DataInsercao],
        r.[DataAlteracao]
      FROM [monitor].[tblcliente_tipoarquivo_regra] r
      LEFT JOIN [monitor].[tblregra] rg ON r.[IdRegra] = rg.[IdRegra];`);

    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar Regras:', err.message);
    res.status(500).send('Erro ao buscar Regras');
  } finally {
    await sql.close();
  }
});

// Rota para buscar dados dos tipos de arquivo
app.get('/tiposdearquivos', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT IdTipoArquivo,TipoArquivo,Descricao,Ativo FROM monitor.tbltipoarquivo');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar tipos de arquivo:', err.message);
    res.status(500).send('Erro ao buscar tipos de arquivo');
  } finally {
    await sql.close();
  }
});

// Rota para buscar dados das extensões
app.get('/extensoes', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT IdExtensaoArquivo,ExtensaoArquivo,Ativo FROM monitor.tblextensaoarquivo');
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar extensões:', err.message);
    res.status(500).send('Erro ao buscar extensões');
  } finally {
    await sql.close();
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const express = require('express');
const sql = require('mssql'); // Importando mssql
const config = require('../conecta'); // Importando a configuração de conexão

const router = express.Router();

// Middleware para conectar e desconectar do banco de dados
const connectToDatabase = async (req, res, next) => {
  try {
    // Garante que não haja conexões abertas antes de criar uma nova
    if (sql.pool && sql.pool.connected) {
        console.log("Fechando conexão existente antes de abrir nova.");
        await sql.pool.close();
    }
    req.db = await sql.connect(config); // Armazena a conexão no request
    console.log("Conexão estabelecida para a requisição.");
    next();
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    // Tenta fechar se a conexão foi parcialmente estabelecida
    if (sql.pool && sql.pool.connecting) {
        try { await sql.pool.close(); } catch (closeErr) { console.error("Erro ao fechar pool durante erro de conexão:", closeErr); }
    }
    res.status(500).send('Erro no servidor ao conectar ao banco.');
  }
};

const closeConnection = async (req, res) => { // Modificado para aceitar req, res
  try {
    if (req.db && req.db.connected) {
      await req.db.close();
      console.log("Conexão fechada após a requisição.");
    } else {
      console.log("Nenhuma conexão ativa para fechar ou já fechada.");
    }
  } catch (err) {
    console.error('Erro ao fechar conexão com o banco de dados:', err.message);
  }
};

// --- Rota GET /arquivos ---
router.get('/arquivos', connectToDatabase, async (req, res) => {
  try {
    const request = new sql.Request(req.db); // Usa a conexão do request
    const query = `
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
        cta.[Ativo],
        cta.[NomeCampoData] -- Adicionado para exibição se necessário
      FROM tblcliente_tipoarquivo cta
      LEFT JOIN tblcliente c ON cta.[IdCliente] = c.[IdCliente]
      LEFT JOIN tbltipoarquivo ta ON cta.[IdTipoArquivo] = ta.[IdTipoArquivo]
      LEFT JOIN tblextensaoarquivo ea ON cta.[IdExtensaoArquivo] = ea.[IdExtensaoArquivo];
    `;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar arquivos:', err.message);
    res.status(500).send('Erro ao buscar arquivos');
  } finally {
    await closeConnection(req, res); // Passa req, res
  }
});

// --- Rota PATCH /desativarArquivo/:idArquivo ---
router.patch('/desativarArquivo/:idArquivo', connectToDatabase, async (req, res) => {
  const { idArquivo } = req.params;
  const transaction = new sql.Transaction(req.db); // Usa a conexão do request

  try {
    await transaction.begin();

    // 1. Deletar as regras associadas ao arquivo
    const requestRegras = new sql.Request(transaction);
    const deleteRegrasQuery = `
      DELETE FROM tblcliente_tipoarquivo_regra
      WHERE IdCliente_TipoArquivo = @idArquivo
    `;
    requestRegras.input('idArquivo', sql.Int, idArquivo);
    await requestRegras.query(deleteRegrasQuery);

    // 2. Deletar o arquivo
    const requestArquivo = new sql.Request(transaction);
    const deleteArquivoQuery = `
      DELETE FROM tblcliente_tipoarquivo
      WHERE IdCliente_TipoArquivo = @idArquivo
    `;
    requestArquivo.input('idArquivo', sql.Int, idArquivo);
    await requestArquivo.query(deleteArquivoQuery);

    await transaction.commit(); // Confirma a transação
    res.status(200).json({ message: 'Arquivo e suas regras deletados com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar arquivo:', err.message);
    if (transaction._active) { // Verifica se a transação está ativa antes do rollback
        await transaction.rollback(); // Reverte a transação em caso de erro
    }
    res.status(500).send('Erro ao deletar arquivo');
  } finally {
    await closeConnection(req, res); // Passa req, res
  }
});


// --- Rota GET /editarArquivo/:idArquivo  ---
router.get('/editarArquivo/:idArquivo', connectToDatabase, async (req, res) => {
  const { idArquivo } = req.params;

  try {
    const request = new sql.Request(req.db); // Usa a conexão do request
    request.input('idArquivo', sql.Int, idArquivo);

    // Busca os dados do arquivo
    const arquivoQuery = `
      SELECT
        cta.[IdCliente_TipoArquivo], c.[IdCliente], c.[Cliente],
        ta.[IdTipoArquivo], ta.[TipoArquivo], ea.[IdExtensaoArquivo],
        ea.[ExtensaoArquivo], cta.[Encoding], cta.[IsHeader], cta.[Header],
        cta.[Chave], cta.[Ativo], cta.[NomeCampoData]
      FROM tblcliente_tipoarquivo cta
      LEFT JOIN tblcliente c ON cta.[IdCliente] = c.[IdCliente]
      LEFT JOIN tbltipoarquivo ta ON cta.[IdTipoArquivo] = ta.[IdTipoArquivo]
      LEFT JOIN tblextensaoarquivo ea ON cta.[IdExtensaoArquivo] = ea.[IdExtensaoArquivo]
      WHERE cta.[IdCliente_TipoArquivo] = @idArquivo
    `;
    const arquivoResult = await request.query(arquivoQuery);

    if (arquivoResult.recordset.length === 0) {
      return res.status(404).send('Arquivo não encontrado');
    }
    const arquivo = arquivoResult.recordset[0];

    // Busca as regras associadas ao arquivo
    const regrasQuery = `
      SELECT
        IdRegra, IdTipoDeDado, Formato, DescricaoCampo, Obrigatorio
      FROM tblcliente_tipoarquivo_regra
      WHERE IdCliente_TipoArquivo = @idArquivo
    `;
    const regrasResult = await request.query(regrasQuery);
    const regrasDb = regrasResult.recordset; // Renomeado para evitar conflito

    // Busca clientes, tipos de arquivo, extensões e TIPOS DE DADOS ativos
    const clientesQuery = "SELECT IdCliente, Cliente FROM tblcliente WHERE Ativo = 1";
    const tiposArquivoQuery = "SELECT IdTipoArquivo, TipoArquivo FROM tbltipoarquivo WHERE Ativo = 1";
    const extensoesQuery = "SELECT IdExtensaoArquivo, ExtensaoArquivo FROM tblextensaoarquivo WHERE Ativo = 1";
    const tiposDadosQuery = "SELECT IdTipoDeDados, TipoDeDado FROM tbltipodedados WHERE Ativo = 1"; // Busca os tipos de dados

    const [clientesResult, tiposArquivoResult, extensoesResult, tiposDadosResult] = await Promise.all([
      request.query(clientesQuery),
      request.query(tiposArquivoQuery),
      request.query(extensoesQuery),
      request.query(tiposDadosQuery) // Executa a query de tipos de dados
    ]);

    const clientes = clientesResult.recordset;
    const tiposArquivo = tiposArquivoResult.recordset;
    const extensoes = extensoesResult.recordset;
    const tiposDados = tiposDadosResult.recordset; // Armazena os tipos de dados

    // Renderiza a página de edição
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/png" sizes="16x16" href="../plugins/images/favicon.png">
        <title>Editar Arquivo - Arker Data Admin</title>
        <link href="/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="/plugins/bower_components/sidebar-nav/dist/sidebar-nav.min.css" rel="stylesheet">
        <link href="/css/style.css" rel="stylesheet">
        <link href="/css/colors/gray-dark.css" id="theme" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
        <style>
          .form-group { margin-bottom: 15px; }
          #regra-panel .row { margin-bottom: 10px; align-items: flex-end; } /* Alinha itens na base */
          #regra-panel hr { margin-top: 0; margin-bottom: 15px; }
          .form-check-input { margin-left: 10px; transform: scale(1.5); } /* Aumenta checkbox */
          .radio-label { margin-left: 5px; } /* Espaço para label do radio */
        </style>
    </head>
    <body class="fix-header">
        <div id="wrapper">
            <nav class="navbar navbar-default navbar-static-top m-b-0">
                <div class="navbar-header">
                    <div class="top-left-part">
                        <a class="logo" href="/">
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
                            <h4 class="page-title">Editar Arquivo</h4>
                        </div>
                         <div class="col-lg-9 col-sm-8 col-md-8 col-xs-12">
                              <ol class="breadcrumb">
                                  <li><a href="#">Tabelas</a></li>
                                  <li class="active">Arquivo</li>
                              </ol>
                          </div>
                    </div>
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="panel">
                                <div class="panel-heading">
                                    Editar Configuração do Arquivo
                                </div>
                                <div class="panel-body">
                                    <form action="/editarArquivo" id="formArquivo" method="POST">
                                        <input type="hidden" name="IdCliente_TipoArquivo" value="${arquivo.IdCliente_TipoArquivo}">
                                        <div class="row">
                                            <!-- Cliente -->
                                            <div class="form-group col-md-4">
                                                <label for="IdCliente">Cliente *</label>
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
                                                <label for="IdTipoArquivo">Tipo Arquivo *</label>
                                                <select class="form-control" id="IdTipoArquivo" name="IdTipoArquivo" required>
                                                    ${tiposArquivo.map(tipo => `
                                                        <option value="${tipo.IdTipoArquivo}" ${tipo.IdTipoArquivo === arquivo.IdTipoArquivo ? 'selected' : ''}>
                                                            ${tipo.TipoArquivo}
                                                        </option>
                                                    `).join('')}
                                                </select>
                                            </div>
                                            <!-- Extensão -->
                                            <div class="form-group col-md-4">
                                                <label for="IdExtensaoArquivo">Extensão *</label>
                                                <select class="form-control" id="IdExtensaoArquivo" name="IdExtensaoArquivo" required>
                                                    ${extensoes.map(extensao => `
                                                        <option value="${extensao.IdExtensaoArquivo}" ${extensao.IdExtensaoArquivo === arquivo.IdExtensaoArquivo ? 'selected' : ''}>
                                                            ${extensao.ExtensaoArquivo}
                                                        </option>
                                                    `).join('')}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <!-- Encoding -->
                                            <div class="form-group col-md-3">
                                                <label for="Encoding">Encoding *</label>
                                                <select class="form-control" id="Encoding" name="Encoding" required>
                                                    <option value="UTF-8" ${arquivo.Encoding === 'UTF-8' ? 'selected' : ''}>UTF-8</option>
                                                    <option value="windows-1252" ${arquivo.Encoding === 'windows-1252' ? 'selected' : ''}>windows-1252</option>
                                                    <option value="latin1" ${arquivo.Encoding === 'latin1' ? 'selected' : ''}>latin1</option>
                                                </select>
                                            </div>
                                            <!-- IsHeader -->
                                            <div class="form-group col-md-3">
                                                <label for="IsHeader">Possui Cabeçalho? *</label>
                                                <select class="form-control" id="IsHeader" name="IsHeader" required>
                                                    <option value="1" ${arquivo.IsHeader == 1 ? 'selected' : ''}>Sim</option>
                                                    <option value="0" ${arquivo.IsHeader == 0 ? 'selected' : ''}>Não</option>
                                                </select>
                                            </div>
                                            <!-- Chave -->
                                            <div class="form-group col-md-3">
                                                <label for="Chave">Chave (Separador) *</label>
                                                <input type="text" class="form-control" id="Chave" name="Chave" value="${arquivo.Chave || ''}" required>
                                            </div>
                                             <!-- Ativo -->
                                            <div class="form-group col-md-3">
                                                <label for="Ativo">Ativo *</label>
                                                <select class="form-control" id="Ativo" name="Ativo" required>
                                                    <option value="1" ${arquivo.Ativo === true ? 'selected' : ''}>Sim</option>
                                                    <option value="0" ${arquivo.Ativo === false ? 'selected' : ''}>Não</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <!-- Header -->
                                            <div class="form-group col-md-12">
                                                <label for="Header">Header (Campos separados por vírgula) *</label>
                                                <input type="text" class="form-control" id="Header" name="Header" value="${arquivo.Header || ''}" required>
                                            </div>
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
                                    <button type="button" id="btnRedefinirSchema" class="btn btn-info" style="margin-left: 20px;">
                                        <i class="fa fa-refresh"></i> Redefinir Schema com Base no Header
                                    </button>
                                </div>
                                <div class="panel-body" id="regra-panel">
                                    <form id="formRegra">
                                        <div class="row">
                                            
                                            <div class="col-md-2"><h5>Nome Campo</h5></div>
                                            <div class="col-md-2"><h5>Tipo De Dado *</h5></div>
                                            <div class="col-md-2"><h5>Formato</h5></div>
                                            <div class="col-md-3"><h5>Regra *</h5></div>
                                            <div class="col-md-2 text-center"><h5>Obrigatório?</h5></div>
                                            <div class="col-md-1 text-center"><h5>É Data?</h5></div>
                                        </div>
                                        <hr>
                                        <!-- As linhas de regras serão geradas aqui pelo JS -->
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <footer class="footer text-center"> 2025 &copy; FormArker </footer>
            </div>
        </div>

    <script src="/plugins/bower_components/jquery/dist/jquery.min.js"></script>
    <script src="/bootstrap/dist/js/bootstrap.min.js"></script>
    <script src="/plugins/bower_components/sidebar-nav/dist/sidebar-nav.min.js"></script>
    <script src="/js/jquery.slimscroll.js"></script>
    <script src="/js/waves.js"></script>
    <script src="/js/custom.min.js"></script>
    <script>
        // Armazena os dados buscados para uso no JS
        const tiposDados = ${JSON.stringify(tiposDados)};
        const regrasDb = ${JSON.stringify(regrasDb)};
        const nomeCampoDataDb = "${arquivo.NomeCampoData || ''}";
        console.log('Tipos de Dados disponíveis:', tiposDados);
        console.log('Regras do Banco (regrasDb):', regrasDb);
        let todasRegrasSistema = []; // Para armazenar regras de /regras

        // Função para buscar TODAS as regras ativas do sistema (para os selects)
        async function carregarRegrasSistema() {
            try {
                const response = await fetch('/regras'); // Endpoint que busca de tblregra
                if (!response.ok) throw new Error('Falha ao buscar regras do sistema');
                const regras = await response.json();
                todasRegrasSistema = regras.filter(r => r.Ativo === true);
            } catch (error) {
                console.error('Erro ao carregar regras do sistema:', error);
                alert('Erro ao carregar regras do sistema. Verifique o console.');
            }
        }

        // Função para gerar UMA linha de regra no formulário
        function gerarLinhaRegra(index, campoInfo) {
            const { DescricaoCampo = '', IdTipoDeDado = null, Formato = '', IdRegra = null, Obrigatorio = false } = campoInfo;
            const isDataField = DescricaoCampo === nomeCampoDataDb;

            const row = document.createElement('div');
            row.className = 'row regra-linha'; // Adiciona classe para fácil seleção
            row.dataset.index = index; // Guarda o índice

            // Coluna: É Data?
            const colData = document.createElement('div');
            colData.className = 'form-group col-md-1 text-center';
            const radioData = document.createElement('input');
            radioData.type = 'radio';
            radioData.className = 'form-check-input campo-data-radio'; // <-- CORRIGIDO
            radioData.name = 'campoDataIndicador';
            radioData.value = DescricaoCampo;
            radioData.checked = isDataField;
            colData.appendChild(radioData);

            // Coluna: Nome do Campo (Readonly)
            const colNomeCampo = document.createElement('div');
            colNomeCampo.className = 'form-group col-md-2';
            const inputNomeCampo = document.createElement('input');
            inputNomeCampo.type = 'text';
            inputNomeCampo.className = 'form-control nome-campo';
            inputNomeCampo.value = DescricaoCampo;
            inputNomeCampo.readOnly = true;
            colNomeCampo.appendChild(inputNomeCampo);

            // Coluna: Tipo de Dado (Select)
            const colTipoDado = document.createElement('div');
            colTipoDado.className = 'form-group col-md-2';
            const selectTipoDado = document.createElement('select');
            selectTipoDado.className = 'form-control tipo-dado';
            selectTipoDado.required = true;
            // Option vazia
            selectTipoDado.appendChild(new Option('Selecione...', ''));
            // Preenche com tipos de dados buscados
            tiposDados.forEach(tipo => {

                const option = new Option(tipo.TipoDeDado, tipo.IdTipoDeDados);
                option.selected = (tipo.IdTipoDeDados == IdTipoDeDado); // Usa == para comparação flexível
                selectTipoDado.appendChild(option);
            });
            colTipoDado.appendChild(selectTipoDado);

            // Coluna: Formato (Input Text)
            const colFormato = document.createElement('div');
            colFormato.className = 'form-group col-md-2';
            const inputFormato = document.createElement('input');
            inputFormato.type = 'text';
            inputFormato.className = 'form-control formato';
            inputFormato.value = Formato || '';
            inputFormato.placeholder = 'Ex: dd/MM/yyyy';
            colFormato.appendChild(inputFormato);

            // Coluna: Regra (Select)
            const colRegra = document.createElement('div');
            colRegra.className = 'form-group col-md-3';
            const selectRegra = document.createElement('select');
            selectRegra.className = 'form-control regra-select';
            selectRegra.required = true;
             // Option vazia
            selectRegra.appendChild(new Option('Selecione...', ''));
            // Preenche com regras do sistema
            todasRegrasSistema.forEach(regra => {
                const option = new Option(regra.Regra, regra.IdRegra);
                 option.selected = (regra.IdRegra == IdRegra); // Usa ==
                selectRegra.appendChild(option);
            });
            colRegra.appendChild(selectRegra);

            // Coluna: Obrigatório (Checkbox)
            const colObrigatorio = document.createElement('div');
            colObrigatorio.className = 'form-group col-md-2 text-center';
            const checkboxObrigatorio = document.createElement('input');
            checkboxObrigatorio.type = 'checkbox';
            checkboxObrigatorio.className = 'form-check-input obrigatorio';
            checkboxObrigatorio.checked = (Obrigatorio == 1 || Obrigatorio === true); // Flexibilidade na verificação
            colObrigatorio.appendChild(checkboxObrigatorio);

            // Add event listener to the Tipo de Dado select for THIS row
            selectTipoDado.addEventListener('change', function () {
                // Find the corresponding radio button in the same row
                // 'this' refers to the select element that changed
                const rowElement = this.closest('.regra-linha'); // Get the parent row div
                const radioDataElement = rowElement.querySelector('.campo-data-radio'); // Find the radio button using its class

                // Find the selected type object from the global tiposDados array
                const selectedTipo = tiposDados.find(tipo => tipo.IdTipoDeDados === parseInt(this.value));

                // Check if the selected type exists and its name is 'date' (case-insensitive check is safer)
                if (selectedTipo && selectedTipo.TipoDeDado.toLowerCase() === 'date') {
                    // If it's a date type, enable the radio button
                    radioDataElement.disabled = false;
                } else {
                    // Otherwise, disable and uncheck the radio button
                    radioDataElement.disabled = true;
                    radioDataElement.checked = false;
                }
            });
                        const initialSelectedTipo = tiposDados.find(tipo => tipo.IdTipoDeDados === parseInt(selectTipoDado.value));
             if (initialSelectedTipo && initialSelectedTipo.TipoDeDado.toLowerCase() === 'date') {
                radioData.disabled = false;
            } else {
                radioData.disabled = true; //
            }

            // Adiciona as colunas à linha
            
            row.appendChild(colNomeCampo);
            row.appendChild(colTipoDado);
            row.appendChild(colFormato);
            row.appendChild(colRegra);
            row.appendChild(colObrigatorio);
            row.appendChild(colData);

            return row;
        }

        // Função para popular o formulário de regras com base nos dados do DB ou do Header
        function popularFormularioRegras(usarHeader = false) {
            const formRegra = document.getElementById('formRegra');
            const headerInput = document.getElementById('Header');

            // Limpa as linhas de regras existentes (mantém o cabeçalho da tabela)
            formRegra.querySelectorAll('.regra-linha').forEach(linha => linha.remove());

            let camposParaGerar = [];

            if (usarHeader) {
                if (!headerInput || !headerInput.value.trim()) {
                    alert('O campo "Header" está vazio ou não foi encontrado. Insira os nomes dos campos separados por vírgula.');
                    return;
                }
                const nomesCamposHeader = headerInput.value.split(',').map(h => h.trim()).filter(h => h);
                camposParaGerar = nomesCamposHeader.map(nome => ({ DescricaoCampo: nome })); // Cria objetos baseados no header
            } else {
                // Usa os dados das regras buscadas do banco de dados
                camposParaGerar = regrasDb;
            }

            // Gera as linhas no formulário
            camposParaGerar.forEach((campoInfo, index) => {
                const linhaHtml = gerarLinhaRegra(index, campoInfo);
                formRegra.appendChild(linhaHtml);
            });
        }

        // Evento de submit do formulário principal
        document.getElementById('formArquivo').addEventListener('submit', function (e) {
            e.preventDefault(); // Evita o envio padrão

            const regrasParaEnviar = [];
            const linhasRegra = document.querySelectorAll('#formRegra .regra-linha');
            let campoDataSelecionado = document.querySelector('input[name="campoDataIndicador"]:checked');

            linhasRegra.forEach(row => {
                const nomeCampoInput = row.querySelector('.nome-campo');
                const tipoDadoSelect = row.querySelector('.tipo-dado');
                const formatoInput = row.querySelector('.formato');
                const regraSelect = row.querySelector('.regra-select');
                const obrigatorioCheckbox = row.querySelector('.obrigatorio');

                // Validação básica (pode ser melhorada)
                if (!nomeCampoInput || !tipoDadoSelect || !formatoInput || !regraSelect || !obrigatorioCheckbox) {
                    console.error('Elemento faltando na linha de regra:', row);
                    alert('Erro ao processar uma das linhas de regra. Verifique o console.');
                    throw new Error("Elemento de regra faltando"); // Interrompe o processo
                }
                 if (!tipoDadoSelect.value) {
                    alert(\`Por favor, selecione o Tipo de Dado para o campo: \${nomeCampoInput.value}\`);
                    tipoDadoSelect.focus();
                    throw new Error("Tipo de dado não selecionado");
                }
                if (!regraSelect.value) {
                    alert(\`Por favor, selecione a Regra para o campo: \${nomeCampoInput.value}\`);
                    regraSelect.focus();
                    throw new Error("Regra não selecionada");
                }


                regrasParaEnviar.push({
                    DescricaoCampo: nomeCampoInput.value,
                    IdTipoDeDado: parseInt(tipoDadoSelect.value) || null, // Garante INT ou null
                    Formato: formatoInput.value,
                    IdRegra: parseInt(regraSelect.value) || null, // Garante INT ou null
                    Obrigatorio: obrigatorioCheckbox.checked ? 1 : 0,
                    // Adiciona a flag 'Data' se este for o campo selecionado no radio button
                    Data: (campoDataSelecionado && campoDataSelecionado.value === nomeCampoInput.value) ? 1 : 0
                });
            });

            // Adiciona o JSON ao campo hidden
            document.getElementById('regrasJson').value = JSON.stringify(regrasParaEnviar);
            console.log('Regras JSON para enviar:', document.getElementById('regrasJson').value);

            // Envia o formulário
            this.submit();
        });

        // Evento do botão "Redefinir Schema"
        document.getElementById('btnRedefinirSchema').addEventListener('click', () => {
            if (confirm('Isso substituirá as regras atuais pelas definidas no campo Header. Deseja continuar?')) {
                popularFormularioRegras(true); // Chama a função para usar o header
            }
        });

        // Inicialização ao carregar a página
        document.addEventListener('DOMContentLoaded', async () => {
            await carregarRegrasSistema(); // Carrega as regras do sistema primeiro
            popularFormularioRegras(false); // Popula com os dados do banco inicialmente
        });

    </script>
    </body>
    </html>
    `);
  } catch (err) {
    console.error('Erro ao buscar dados para edição do arquivo:', err.message, err.stack);
    res.status(500).send('Erro ao buscar dados para edição do arquivo');
  } finally {
    await closeConnection(req, res); // Passa req, res
  }
});

// --- Rota POST /editarArquivo ---
router.post('/editarArquivo', connectToDatabase, async (req, res) => {
  const {
    IdCliente_TipoArquivo, IdCliente, IdTipoArquivo, IdExtensaoArquivo,
    Encoding, IsHeader, Header, Chave, Ativo, regrasJson
  } = req.body;

  if (!regrasJson) {
    return res.status(400).send('O campo regrasJson é obrigatório.');
  }

  let regras;
  try {
    regras = JSON.parse(regrasJson);
    if (!Array.isArray(regras)) throw new Error('regrasJson não é um array.');
    console.log('Regras recebidas e parseadas:', regras);
  } catch (err) {
    console.error('Erro ao parsear regrasJson:', err.message);
    return res.status(400).send('Formato inválido para regrasJson.');
  }

  const transaction = new sql.Transaction(req.db); // Usa a conexão do request

  try {
    await transaction.begin();
    console.log("Transação iniciada para edição.");



    // 2. Determinar NomeCampoData a partir das regras recebidas
    const regraData = regras.find(r => r.Data === 1); 
    const nomeCampoData = regraData ? regraData.DescricaoCampo : null;
    console.log('NomeCampoData determinado:', nomeCampoData);

    // 3. Atualizar o registro principal em tblcliente_tipoarquivo
    const requestArquivo = new sql.Request(transaction);
    requestArquivo.input('IdCliente', sql.Int, IdCliente);
    requestArquivo.input('IdTipoArquivo', sql.Int, IdTipoArquivo);
    requestArquivo.input('IdExtensaoArquivo', sql.Int, IdExtensaoArquivo);
    requestArquivo.input('Encoding', sql.NVarChar, Encoding);
    requestArquivo.input('IsHeader', sql.Int, IsHeader); 
    requestArquivo.input('Header', sql.NVarChar, Header);
    requestArquivo.input('Chave', sql.NVarChar, Chave);
    requestArquivo.input('Ativo', sql.Int, Ativo); 
    requestArquivo.input('NomeCampoData', sql.NVarChar, nomeCampoData); // Atualiza o campo data
    requestArquivo.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo); // WHERE clause

    const updateArquivoQuery = `
      UPDATE tblcliente_tipoarquivo
      SET
        IdCliente = @IdCliente,
        IdTipoArquivo = @IdTipoArquivo,
        IdExtensaoArquivo = @IdExtensaoArquivo,
        Encoding = @Encoding,
        IsHeader = @IsHeader,
        Header = @Header,
        Chave = @Chave,
        Ativo = @Ativo,
        NomeCampoData = @NomeCampoData, -- Incluído
        DataAlteracao = GETDATE() -- Atualiza data de alteração
      WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo
    `;
    await requestArquivo.query(updateArquivoQuery);
    console.log('Registro principal tblcliente_tipoarquivo atualizado.');

    // 4. Deletar TODAS as regras antigas associadas a este arquivo
    const requestDeleteRegras = new sql.Request(transaction);
    requestDeleteRegras.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);
    const deleteRegrasQuery = `
      DELETE FROM tblcliente_tipoarquivo_regra
      WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo
    `;
    const deleteResult = await requestDeleteRegras.query(deleteRegrasQuery);
    console.log(`${deleteResult.rowsAffected[0]} regras antigas deletadas.`);

    // 5. Inserir as novas regras recebidas
    for (const regra of regras) {
      const { IdRegra, IdTipoDeDado, Formato, DescricaoCampo, Obrigatorio } = regra;
      console.log('Inserindo regra para o campo:', DescricaoCampo);

      // Validação básica dos dados da regra
      if (IdTipoDeDado == null || IdRegra == null || DescricaoCampo == null || Obrigatorio == null) {
           console.warn('Regra inválida ou incompleta sendo pulada:', regra);
           continue; 
      }


      const requestInsertRegra = new sql.Request(transaction);
      requestInsertRegra.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);
      requestInsertRegra.input('IdRegra', sql.Int, IdRegra);
      requestInsertRegra.input('IdTipoDeDado', sql.Int, IdTipoDeDado); 
      requestInsertRegra.input('Formato', sql.VarChar, Formato || null); 
      requestInsertRegra.input('DescricaoCampo', sql.NVarChar, DescricaoCampo);
      requestInsertRegra.input('Obrigatorio', sql.Bit, Obrigatorio); 

      const insertRegraQuery = `
        INSERT INTO tblcliente_tipoarquivo_regra
        (IdCliente_TipoArquivo, IdRegra, IdTipoDeDado, Formato, DescricaoCampo, Obrigatorio, DataInsercao)
        VALUES (@IdCliente_TipoArquivo, @IdRegra, @IdTipoDeDado, @Formato, @DescricaoCampo, @Obrigatorio, GETDATE());
      `;
      await requestInsertRegra.query(insertRegraQuery);
    }
    console.log('Novas regras inseridas com sucesso.');

    // Commit da transação
    await transaction.commit();
    console.log("Transação concluída com sucesso.");

    res.redirect('/arquivo'); // Redireciona para a página de arquivos

  } catch (err) {
    console.error('Erro ao atualizar arquivo:', err.message, err.stack);
    // Rollback em caso de erro
    if (transaction._active) { // Verifica se a transação está ativa
      console.log("Erro detectado, iniciando rollback da transação.");
      await transaction.rollback();
      console.log("Rollback concluído.");
    } else {
        console.log("Erro detectado, mas transação não está ativa para rollback.");
    }
    // Envia uma resposta de erro mais detalhada
    res.status(500).send(`Erro ao atualizar arquivo: ${err.message}`);
  } finally {
    await closeConnection(req, res);
  }
});


// --- Rota POST /cadastroarquivo ---
router.post('/cadastroarquivo', connectToDatabase, async (req, res) => {
  const { IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, regrasJson } = req.body;
  const transaction = new sql.Transaction(req.db); // Usa a conexão do request

  try {
    await transaction.begin();
    console.log('Transação iniciada para cadastro.');

    console.log('Dados recebidos:', { IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, regrasJson });

    const regras = JSON.parse(regrasJson);
    console.log('Regras parseadas:', regras);

    const regraData = regras.find(regra => regra.Data === 1); 
    const nomeCampoData = regraData ? regraData.DescricaoCampo : null;
    console.log('Nome do campo data:', nomeCampoData);

    // Verifica duplicidade DENTRO da transação
    const requestCheck = new sql.Request(transaction);
    const checkDuplicateQuery = `
      SELECT COUNT(*) AS count
      FROM tblcliente_tipoarquivo
      WHERE IdCliente = @IdCliente AND IdTipoArquivo = @IdTipoArquivo;
    `;
    requestCheck.input('IdCliente', sql.Int, IdCliente);
    requestCheck.input('IdTipoArquivo', sql.Int, IdTipoArquivo);
    const duplicateResult = await requestCheck.query(checkDuplicateQuery);
    const count = duplicateResult.recordset[0].count;
    console.log('Verificação de duplicidade:', { count });

    if (count > 0) {
      await transaction.rollback(); // Importante fazer rollback antes de retornar erro
      console.log('Combinação duplicada encontrada. Rollback e abortando inserção.');
      return res.status(400).send('Combinação de Cliente e Tipo de Arquivo já existe.');
    }

    // Insere o arquivo na tabela `tblcliente_tipoarquivo`
    const requestInsertArquivo = new sql.Request(transaction);
    const insertArquivoQuery = `
      INSERT INTO tblcliente_tipoarquivo
      (IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, NomeCampoData, DataInsercao)
      OUTPUT INSERTED.IdCliente_TipoArquivo -- Retorna o ID gerado
      VALUES (@IdCliente, @IdTipoArquivo, @IdExtensaoArquivo, @Encoding, @IsHeader, @Header, @Chave, @Ativo, @NomeCampoData, GETDATE());
    `;
    requestInsertArquivo.input('IdCliente', sql.Int, IdCliente); 
    requestInsertArquivo.input('IdTipoArquivo', sql.Int, IdTipoArquivo); 
    requestInsertArquivo.input('IdExtensaoArquivo', sql.Int, IdExtensaoArquivo);
    requestInsertArquivo.input('Encoding', sql.NVarChar, Encoding);
    requestInsertArquivo.input('IsHeader', sql.Int, IsHeader); 
    requestInsertArquivo.input('Header', sql.NVarChar, Header);
    requestInsertArquivo.input('Chave', sql.NVarChar, Chave);
    requestInsertArquivo.input('Ativo', sql.Int, Ativo); 
    requestInsertArquivo.input('NomeCampoData', sql.NVarChar, nomeCampoData);

    const result = await requestInsertArquivo.query(insertArquivoQuery);
    const IdCliente_TipoArquivo = result.recordset[0].IdCliente_TipoArquivo;
    console.log('Arquivo inserido com sucesso. ID gerado:', IdCliente_TipoArquivo);

    // Insere as regras na tabela `tblcliente_tipoarquivo_regra`
    for (const regra of regras) {
      const { IdRegra, IdTipoDeDado, Formato, DescricaoCampo, Obrigatorio } = regra;

      console.log('Processando regra para cadastro:', regra); 

      const regraRequest = new sql.Request(transaction); 
      const insertRegraQuery = `
        INSERT INTO tblcliente_tipoarquivo_regra
        (IdCliente_TipoArquivo, IdRegra, IdTipoDeDado, Formato, DescricaoCampo, Obrigatorio, DataInsercao)
        VALUES (@IdCliente_TipoArquivo, @IdRegra, @IdTipoDeDado, @Formato, @DescricaoCampo, @Obrigatorio, GETDATE());
      `;
      regraRequest.input('IdCliente_TipoArquivo', sql.Int, IdCliente_TipoArquivo);
      regraRequest.input('IdRegra', sql.Int, IdRegra);
      regraRequest.input('IdTipoDeDado', sql.Int, IdTipoDeDado);
      regraRequest.input('Formato', sql.VarChar, Formato || null); 
      regraRequest.input('DescricaoCampo', sql.NVarChar, DescricaoCampo);
      regraRequest.input('Obrigatorio', sql.Bit, Obrigatorio); 

      await regraRequest.query(insertRegraQuery);
      console.log('Regra inserida com sucesso no cadastro:', regra); 
    }


    await transaction.commit();
    console.log('Transação de cadastro concluída com sucesso.');
    res.redirect('/arquivo');

  } catch (err) {
    console.error('Erro ao cadastrar arquivo:', err.message);
    console.error('Stack trace:', err.stack);
     if (transaction._active) { // Verifica se a transação está ativa
      console.log("Erro detectado no cadastro, iniciando rollback da transação.");
      await transaction.rollback();
      console.log("Rollback do cadastro concluído.");
    } else {
        console.log("Erro detectado no cadastro, mas transação não está ativa para rollback.");
    }
    res.status(500).send(`Erro ao cadastrar arquivo: ${err.message}`);
  } finally {
    await closeConnection(req, res); // Passa req, res
  }
});


// --- Rota GET /tipos ---
router.get('/tipos', connectToDatabase, async (req, res) => {
  try {
    const request = new sql.Request(req.db); // Usa a conexão do request
    const result = await request.query('SELECT [IdTipoDeDados],[TipoDeDado],[TipoSqlConvert],[TipoValidacao],[Ativo] FROM tbltipodedados WHERE Ativo = 1'); // Filtra ativos
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar tipo de dados:', err.message);
    res.status(500).send('Erro ao buscar tipo de dados');
  } finally {
    await closeConnection(req, res); // Passa req, res
  }
});

module.exports = router;

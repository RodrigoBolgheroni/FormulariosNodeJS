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

// Rota para buscar dados do arquivo
router.get('/arquivos', connectToDatabase, async (req, res) => {
  try {
    const request = new sql.Request();
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
        cta.[Ativo] 
      FROM [monitor].[tblcliente_tipoarquivo] cta 
      LEFT JOIN [monitor].[tblcliente] c ON cta.[IdCliente] = c.[IdCliente] 
      LEFT JOIN [monitor].[tbltipoarquivo] ta ON cta.[IdTipoArquivo] = ta.[IdTipoArquivo] 
      LEFT JOIN [monitor].[tblextensaoarquivo] ea ON cta.[IdExtensaoArquivo] = ea.[IdExtensaoArquivo];
    `;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro ao buscar arquivos:', err.message);
    res.status(500).send('Erro ao buscar arquivos');
  } finally {
    await closeConnection();
  }
});

// Rota para desativar um arquivo
router.patch('/desativarArquivo/:idArquivo', connectToDatabase, async (req, res) => {
  const { idArquivo } = req.params;

  try {
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // 1. Deletar as regras associadas ao arquivo
      const deleteRegrasQuery = `
        DELETE FROM monitor.tblcliente_tipoarquivo_regra
        WHERE IdCliente_TipoArquivo = @idArquivo
      `;
      request.input('idArquivo', sql.Int, idArquivo);
      await request.query(deleteRegrasQuery);

      // 2. Deletar o arquivo
      const deleteArquivoQuery = `
        DELETE FROM monitor.tblcliente_tipoarquivo
        WHERE IdCliente_TipoArquivo = @idArquivo
      `;
      await request.query(deleteArquivoQuery);

      await transaction.commit(); // Confirma a transação
      res.status(200).json({ message: 'Arquivo desativado com sucesso' });
    } catch (error) {
      await transaction.rollback(); // Reverte a transação em caso de erro
      throw error;
    }
  } catch (err) {
    console.error('Erro ao desativar arquivo:', err.message);
    res.status(500).send('Erro ao desativar arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para exibir a página de edição do arquivo
router.get('/editarArquivo/:idArquivo', connectToDatabase, async (req, res) => {
  const { idArquivo } = req.params;

  try {
    const request = new sql.Request();

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
      WHERE cta.[IdCliente_TipoArquivo] = @idArquivo
    `;
    request.input('idArquivo', sql.Int, idArquivo);
    const arquivoResult = await request.query(arquivoQuery);

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
      WHERE IdCliente_TipoArquivo = @idArquivo
    `;
    const regrasResult = await request.query(regrasQuery);
    const regras = regrasResult.recordset;

    // Busca clientes, tipos de arquivo e extensões ativos
    const clientesQuery = "SELECT IdCliente, Cliente FROM monitor.tblcliente WHERE Ativo = 1";
    const tiposArquivoQuery = "SELECT IdTipoArquivo, TipoArquivo FROM monitor.tbltipoarquivo WHERE Ativo = 1";
    const extensoesQuery = "SELECT IdExtensaoArquivo, ExtensaoArquivo FROM monitor.tblextensaoarquivo WHERE Ativo = 1";

    const [clientesResult, tiposArquivoResult, extensoesResult] = await Promise.all([
      request.query(clientesQuery),
      request.query(tiposArquivoQuery),
      request.query(extensoesQuery)
    ]);

    const clientes = clientesResult.recordset;
    const tiposArquivo = tiposArquivoResult.recordset;
    const extensoes = extensoesResult.recordset;

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
    `); // Mantenha o HTML original aqui
  } catch (err) {
    console.error('Erro ao buscar arquivo:', err.message);
    res.status(500).send('Erro ao buscar arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para editar um arquivo
router.post('/editarArquivo', connectToDatabase, async (req, res) => {
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

    // Processar as regras
    for (const regra of regras) {
      const { DescricaoCampo, TipoDeDado, IdRegra, Obrigatorio } = regra;

      const checkRegraQuery = `
        SELECT 1 FROM monitor.tblcliente_tipoarquivo_regra
        WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo AND DescricaoCampo = @DescricaoCampo
      `;
      request.input('DescricaoCampo', sql.NVarChar, DescricaoCampo);
      const regraExists = await request.query(checkRegraQuery);

      if (regraExists.recordset.length > 0) {
        // Atualiza a regra existente
        const updateRegraQuery = `
          UPDATE monitor.tblcliente_tipoarquivo_regra
          SET 
            TipoDeDado = @TipoDeDado,
            IdRegra = @IdRegra,
            Obrigatorio = @Obrigatorio
          WHERE IdCliente_TipoArquivo = @IdCliente_TipoArquivo AND DescricaoCampo = @DescricaoCampo
        `;
        request.input('TipoDeDado', sql.NVarChar, TipoDeDado);
        request.input('IdRegra', sql.Int, IdRegra);
        request.input('Obrigatorio', sql.Bit, Obrigatorio);
        await request.query(updateRegraQuery);
      } else {
        // Adiciona uma nova regra
        const insertRegraQuery = `
          INSERT INTO monitor.tblcliente_tipoarquivo_regra 
          (IdCliente_TipoArquivo, DescricaoCampo, TipoDeDado, IdRegra, Obrigatorio, DataInsercao)
          VALUES (@IdCliente_TipoArquivo, @DescricaoCampo, @TipoDeDado, @IdRegra, @Obrigatorio, GETDATE())
        `;
        await request.query(insertRegraQuery);
      }
    }

    res.redirect('/arquivo'); // Redireciona para a página de arquivos
  } catch (err) {
    console.error('Erro ao atualizar arquivo:', err.message);
    res.status(500).send('Erro ao atualizar arquivo');
  } finally {
    await closeConnection();
  }
});

// Rota para cadastrar um arquivo
router.post('/cadastroarquivo', connectToDatabase, async (req, res) => {
  const { IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, regrasJson } = req.body;

  try {
    const regras = JSON.parse(regrasJson);

    const request = new sql.Request();
    request.input('IdCliente', sql.Int, IdCliente);
    request.input('IdTipoArquivo', sql.Int, IdTipoArquivo);
    request.input('IdExtensaoArquivo', sql.Int, IdExtensaoArquivo);
    request.input('Encoding', sql.NVarChar, Encoding);
    request.input('IsHeader', sql.Bit, IsHeader);
    request.input('Header', sql.NVarChar, Header);
    request.input('Chave', sql.NVarChar, Chave);
    request.input('Ativo', sql.Bit, Ativo);

    const insertArquivoQuery = `
      INSERT INTO monitor.tblcliente_tipoarquivo 
      (IdCliente, IdTipoArquivo, IdExtensaoArquivo, Encoding, IsHeader, Header, Chave, Ativo, DataInsercao) 
      VALUES (@IdCliente, @IdTipoArquivo, @IdExtensaoArquivo, @Encoding, @IsHeader, @Header, @Chave, @Ativo, GETDATE());
      SELECT SCOPE_IDENTITY() AS IdCliente_TipoArquivo;
    `;
    const result = await request.query(insertArquivoQuery);
    const IdCliente_TipoArquivo = result.recordset[0].IdCliente_TipoArquivo;

    // Inserir as regras
    for (const regra of regras) {
      const { IdRegra, TipoDeDado, DescricaoCampo, Obrigatorio } = regra;

      const insertRegraQuery = `
        INSERT INTO monitor.tblcliente_tipoarquivo_regra 
        (IdCliente_TipoArquivo, IdRegra, TipoDeDado, DescricaoCampo, Obrigatorio, DataInsercao) 
        VALUES (@IdCliente_TipoArquivo, @IdRegra, @TipoDeDado, @DescricaoCampo, @Obrigatorio, GETDATE());
      `;
      request.input('IdRegra', sql.Int, IdRegra);
      request.input('TipoDeDado', sql.NVarChar, TipoDeDado);
      request.input('DescricaoCampo', sql.NVarChar, DescricaoCampo);
      request.input('Obrigatorio', sql.Bit, Obrigatorio);
      await request.query(insertRegraQuery);
    }

    res.redirect('/arquivo');
  } catch (err) {
    console.error('Erro ao cadastrar arquivo:', err.message);
    res.status(500).send('Erro ao cadastrar arquivo');
  } finally {
    await closeConnection();
  }
});

module.exports = router;
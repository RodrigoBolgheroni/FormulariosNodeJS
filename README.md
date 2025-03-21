# FormulariosNodeJS

FormulariosNodeJS é uma aplicação desenvolvida em Node.js que oferece formulários para o controle e gerenciamento de banco de dados.

## Funcionalidades

- Formulários para cadastro e gerenciamento de clientes.
- Formulários para cadastro e gerenciamento de arquivos.
- Formulários para cadastro e gerenciamento de extensões de arquivos.
- Formulários para cadastro e gerenciamento de regras relacionadas a arquivos.
- Formulários para cadastro e gerenciamento de tipos de arquivos.

## Estrutura do Projeto

O projeto possui a seguinte estrutura de diretórios e arquivos principais:

- **node_modules/**: Contém as dependências do Node.js.
- **public/**: Diretório para arquivos públicos, como CSS, JavaScript e imagens.
- **routes/**: Contém os arquivos de rotas da aplicação.
- **.gitattributes**: Configurações de atributos do Git.
- **.gitignore**: Especifica arquivos e diretórios que o Git deve ignorar.
- **README.md**: Arquivo de documentação do projeto.
- **arquivo.html**: Página para gerenciamento de arquivos.
- **basic-table.html**: Exemplo de tabela básica.
- **cadastroarquivo.html**: Formulário para cadastro de arquivos.
- **cadastrocliente.html**: Formulário para cadastro de clientes.
- **cadastroextensao.html**: Formulário para cadastro de extensões de arquivos.
- **cadastroregra.html**: Formulário para cadastro de regras.
- **cadastroregraarquivo.html**: Formulário para cadastro de regras de arquivos.
- **cadastrotipodearquivo.html**: Formulário para cadastro de tipos de arquivos.
- **clientes.html**: Página para gerenciamento de clientes.
- **conecta.js**: Script para conexão com o banco de dados.
- **extensoes.html**: Página para gerenciamento de extensões de arquivos.
- **index.html**: Página inicial da aplicação.
- **package-lock.json**: Arquivo de bloqueio de versões das dependências.
- **package.json**: Arquivo de configuração do projeto Node.js.
- **regra.html**: Página para gerenciamento de regras.
- **server.js**: Arquivo principal que inicia o servidor Node.js.

## Pré-requisitos

- Node.js instalado (versão 14 ou superior).
- Banco de dados compatível (por exemplo, MySQL, PostgreSQL).

## Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/RodrigoBolgheroni/FormulariosNodeJS.git
   ```

2. Navegue até o diretório do projeto:

   ```bash
   cd FormulariosNodeJS
   ```

3. Instale as dependências:

   ```bash
   npm install
   ```

4. Configure a conexão com o banco de dados no arquivo `conecta.js`.

## Execução

Após a instalação e configuração, inicie o servidor:

```bash
node server.js
```

A aplicação estará disponível em `http://localhost:3000`.

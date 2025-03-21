// Aqui você pode adicionar interatividade ou validação do formulário

document.addEventListener('DOMContentLoaded', function () {
  // Exemplo: Adicionando uma validação simples no formulário antes de enviar
  const form = document.querySelector('form');
  form.addEventListener('submit', function (event) {
    const clienteInput = document.querySelector('input[name="cliente"]');
    const ativoSelect = document.querySelector('select[name="ativo"]');

    if (!clienteInput.value || !ativoSelect.value) {
      alert('Todos os campos são obrigatórios!');
      event.preventDefault(); // Impede o envio do formulário
    }
  });
});

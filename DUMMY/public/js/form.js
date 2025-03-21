function abrirTextBox() {
    document.getElementById("text-box-container").classList.toggle("hidden");
}

function salvarCampos() {
    let campoTexto = document.getElementById("campo-texto").value;
    let campoContainer = document.getElementById("campo-container");

    if (campoTexto.trim() === "") {
        alert("Digite pelo menos um campo.");
        return;
    }

    let campos = campoTexto.split(",").map(campo => campo.trim()).filter(campo => campo !== "");

    campos.forEach(nomeCampo => {
        let div = document.createElement("div");
        div.classList.add("campo-item");
        div.innerHTML = `
            <input type="text" class="input-1" value="${nomeCampo}" readonly>
            <select class="input-1">
                <option value="">Tipo</option>
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="date">Data</option>
            </select>
            <select class="input-1">
                <option value="">Regra</option>
                <option value="required">Obrigatório</option>
                <option value="optional">Opcional</option>
            </select>
            <label>
                <input type="checkbox" class="campo-check"> Obrigatório
            </label>
        `;
        campoContainer.appendChild(div);
    });

    document.getElementById("campo-texto").value = "";
    document.getElementById("text-box-container").classList.add("hidden");
}

function adicionarCampo() {
    let container = document.getElementById("campo-container");
    let div = document.createElement("div");
    div.classList.add("campo-item");
    div.innerHTML = `
        <input type="text" class="input-1" placeholder="Nome do Campo">
        <select class="input-1">
            <option value="">Tipo</option>
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="date">Data</option>
        </select>
        <select class="input-1">
            <option value="">Regra</option>
            <option value="required">Obrigatório</option>
            <option value="optional">Opcional</option>
        </select>
        <label>
            <input type="checkbox" class="campo-check"> Obrigatório
        </label>
    `;
    container.appendChild(div);
}
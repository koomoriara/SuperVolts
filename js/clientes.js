exigirLogin(); exigirPermissao("clientes");
const usuario = obterUsuario();
document.querySelector("#nomeUsuario").textContent = usuario.nome;
document.querySelector("#tipoUsuario").textContent = usuario.tipo === "proprietario" ? "Proprietário" : "Gestor";
document.querySelector("#sair").addEventListener("click", e => {e.preventDefault(); encerrarSessao();});
const sidebar = document.querySelector("#sidebar"), overlay = document.querySelector("#overlay");
document.querySelector("#menuToggle").addEventListener("click", () => {sidebar.classList.add("open"); overlay.classList.add("active");});
overlay.addEventListener("click", () => {sidebar.classList.remove("open"); overlay.classList.remove("active");});

let clientes = [], projetos = [];
async function carregarClientes() {
  try {
    [clientes, projetos] = await Promise.all([apiGet("clientes"), apiGet("projetos")]);
    renderizarClientes();
  } catch (erro) { mostrarMensagem("Erro ao carregar clientes: " + erro.message, "error"); }
}
function renderizarClientes() {
  const busca = document.querySelector("#buscaCliente").value.trim().toLowerCase();
  const filtro = document.querySelector("#filtroCliente").value;
  let filtrados = clientes.filter(c => !busca || [c.nome,c.documento,c.email].join(" ").toLowerCase().includes(busca));
  filtrados = filtrados.filter(c => filtro === "comProjeto" ? projetos.some(p => p.clienteId === c.id) : filtro === "semProjeto" ? !projetos.some(p => p.clienteId === c.id) : true);
  const alvo = document.querySelector("#listaClientes");
  alvo.innerHTML = filtrados.length ? filtrados.map(c => `<tr>
    <td><strong>${c.nome}</strong></td><td>${c.documento}</td><td>${c.telefone}</td><td>${c.email}</td><td>${formatarData(c.dataCadastro)}</td>
    <td><button class="btn btn-sm btn-outline-primary me-1" onclick="editarCliente('${c.id}')"><i class="bi bi-pencil"></i></button>${podeExcluirRegistros() ? `<button class="btn btn-sm btn-outline-danger" onclick="excluirCliente('${c.id}')"><i class="bi bi-trash"></i></button>` : ""}</td>
  </tr>`).join("") : '<tr><td colspan="6" class="empty-state">Nenhum cliente encontrado.</td></tr>';
}
document.querySelector("#buscaCliente").addEventListener("input", renderizarClientes);
document.querySelector("#filtroCliente").addEventListener("change", renderizarClientes);
document.querySelector("#novoCliente").addEventListener("click", () => {
  document.querySelector("#formCliente").reset();
  document.querySelector("#clienteId").value = "";
  document.querySelector("#clienteData").value = new Date().toISOString().slice(0,10);
  document.querySelector(".modal-title").textContent = "Cadastrar cliente";
});
function editarCliente(id) {
  const c = clientes.find(item => item.id === id);
  if (!c) return;
  document.querySelector("#clienteId").value = c.id;
  document.querySelector("#clienteNome").value = c.nome;
  document.querySelector("#clienteDocumento").value = c.documento;
  document.querySelector("#clienteTelefone").value = c.telefone;
  document.querySelector("#clienteEmail").value = c.email;
  document.querySelector("#clienteEndereco").value = c.endereco;
  document.querySelector("#clienteData").value = c.dataCadastro;
  document.querySelector("#clienteConsumo").value = c.consumoMensal || "";
  document.querySelector("#clienteTarifa").value = c.tarifaKwh || "";
  document.querySelector("#clienteObservacoes").value = c.observacoes || "";
  document.querySelector(".modal-title").textContent = "Editar cliente";
  bootstrap.Modal.getOrCreateInstance(document.querySelector("#modalCliente")).show();
}
async function excluirCliente(id) {
  if (!podeExcluirRegistros()) { alert("Apenas o proprietário pode excluir registros."); return; }
  const relacionado = projetos.find(p => p.clienteId === id);
  if (relacionado) { alert("Este cliente possui projetos vinculados e não pode ser excluído."); return; }
  if (!confirm("Deseja realmente excluir este cliente?")) return;
  try { await apiDelete("clientes", id); mostrarMensagem("Cliente excluído com sucesso."); await carregarClientes(); }
  catch (erro) { mostrarMensagem(erro.message, "error"); }
}
document.querySelector("#formCliente").addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.querySelector("#clienteId").value;
  const dados = {
    id: id || `cli-${Date.now()}`, nome: document.querySelector("#clienteNome").value.trim(),
    documento: document.querySelector("#clienteDocumento").value.trim(), telefone: document.querySelector("#clienteTelefone").value.trim(),
    email: document.querySelector("#clienteEmail").value.trim(), endereco: document.querySelector("#clienteEndereco").value.trim(),
    dataCadastro: document.querySelector("#clienteData").value,
    consumoMensal: Number(document.querySelector("#clienteConsumo").value),
    tarifaKwh: Number(document.querySelector("#clienteTarifa").value),
    observacoes: document.querySelector("#clienteObservacoes").value.trim()
  };
  if (Object.values(dados).slice(1,7).some(v => !v)) { mostrarMensagem("Preencha todos os campos obrigatórios.", "error"); return; }
  try {
    if (id) await apiPut("clientes", id, dados); else await apiPost("clientes", dados);
    bootstrap.Modal.getInstance(document.querySelector("#modalCliente")).hide();
    mostrarMensagem(id ? "Cliente atualizado." : "Cliente cadastrado.");
    await carregarClientes();
  } catch (erro) { mostrarMensagem(erro.message, "error"); }
});
carregarClientes();

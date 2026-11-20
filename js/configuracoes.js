exigirLogin();
exigirPermissao("configuracoes");

const usuario = obterUsuario();
document.querySelector("#nomeUsuario").textContent = usuario.nome;
document.querySelector("#tipoUsuario").textContent = usuario.tipo === "proprietario" ? "Proprietário" : "Gestor";
document.querySelector("#sair").addEventListener("click", e => {
  e.preventDefault();
  encerrarSessao();
});

const sidebar = document.querySelector("#sidebar");
const overlay = document.querySelector("#overlay");
document.querySelector("#menuToggle").addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("active");
});
overlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
});

let usuarios = [];
const permissoes = ["dashboard","clientes","projetos","equipes","estoque","financeiro","relatorios","configuracoes"];

async function carregar() {
  try {
    const [empresa, lista] = await Promise.all([apiGet("empresa"), apiGet("usuarios")]);
    usuarios = lista;

    if (usuario.tipo === "proprietario") {
      document.querySelector("#empresaNome").value = empresa.nome || "";
      document.querySelector("#empresaTelefone").value = empresa.telefone || "";
      document.querySelector("#empresaEmail").value = empresa.email || "";
      document.querySelector("#empresaEndereco").value = empresa.endereco || "";
      renderizarUsuarios();
    } else {
      document.querySelector("#secaoEmpresa").hidden = true;
      document.querySelector("#secaoUsuarios").hidden = true;
      const perfil = usuarios.find(item => item.id === usuario.id);
      document.querySelector("#perfilId").value = perfil?.id || usuario.id;
      document.querySelector("#perfilNome").value = perfil?.nome || usuario.nome;
      document.querySelector("#perfilEmail").value = perfil?.email || usuario.email;
      document.querySelector("#perfilTipo").value = "Gestor";
    }
  } catch (erro) {
    mostrarMensagem("Erro ao carregar configurações: " + erro.message, "error");
  }
}

function renderizarUsuarios() {
  document.querySelector("#listaUsuarios").innerHTML = usuarios.length
    ? `<div class="table-responsive"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${usuarios.map(u =>
      `<tr><td>${u.nome}</td><td>${u.email}</td><td>${u.tipo === "proprietario" ? "Proprietário" : "Gestor"}</td><td><span class="badge-status ${u.ativo ? "badge-success" : "badge-danger"}">${u.ativo ? "Ativo" : "Inativo"}</span></td><td><button class="btn btn-sm btn-outline-primary me-1" onclick="editarUsuario('${u.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="excluirUsuario('${u.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty-state">Nenhum usuário cadastrado.</div>';
}

document.querySelector("#formPerfil").addEventListener("submit", async e => {
  e.preventDefault();
  const perfil = usuarios.find(item => item.id === document.querySelector("#perfilId").value);
  if (!perfil) {
    mostrarMensagem("Não foi possível localizar o perfil atual.", "error");
    return;
  }
  const senha = document.querySelector("#perfilSenha").value;
  const dados = {
    ...perfil,
    nome: document.querySelector("#perfilNome").value.trim(),
    email: document.querySelector("#perfilEmail").value.trim(),
    senha: senha || perfil.senha
  };
  try {
    await apiPut("usuarios", dados.id, dados);
    usuario.nome = dados.nome;
    usuario.email = dados.email;
    sessionStorage.setItem("superVoltsUsuario", JSON.stringify(usuario));
    document.querySelector("#nomeUsuario").textContent = dados.nome;
    document.querySelector("#perfilSenha").value = "";
    mostrarMensagem("Seu perfil foi atualizado.");
  } catch (erro) {
    mostrarMensagem(erro.message, "error");
  }
});

document.querySelector("#formEmpresa").addEventListener("submit", async e => {
  e.preventDefault();
  if (usuario.tipo !== "proprietario") return;
  const dados = {
    nome: document.querySelector("#empresaNome").value.trim(),
    telefone: document.querySelector("#empresaTelefone").value.trim(),
    email: document.querySelector("#empresaEmail").value.trim(),
    endereco: document.querySelector("#empresaEndereco").value.trim()
  };
  await apiPutObject("empresa", dados);
  mostrarMensagem("Dados da empresa atualizados.");
});

const listaPermissoes = document.querySelector("#listaPermissoes");
listaPermissoes.innerHTML = permissoes.map(p =>
  `<label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="${p}"> ${p}</label>`
).join("");

document.querySelector("#novoUsuario").addEventListener("click", () => {
  if (usuario.tipo !== "proprietario") return;
  document.querySelector("#formUsuario").reset();
  document.querySelector("#usuarioId").value = "";
  document.querySelector("#usuarioSenha").required = true;
  listaPermissoes.querySelectorAll("input").forEach(x => x.checked = false);
});

function editarUsuario(id) {
  if (usuario.tipo !== "proprietario") return;
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  document.querySelector("#usuarioId").value = u.id;
  document.querySelector("#usuarioNome").value = u.nome;
  document.querySelector("#usuarioEmail").value = u.email;
  document.querySelector("#usuarioSenha").value = u.senha;
  document.querySelector("#usuarioTipo").value = u.tipo;
  document.querySelector("#usuarioAtivo").value = String(u.ativo);
  document.querySelector("#usuarioSenha").required = false;
  listaPermissoes.querySelectorAll("input").forEach(x => x.checked = (u.permissoes || []).includes(x.value));
  bootstrap.Modal.getOrCreateInstance(document.querySelector("#modalUsuario")).show();
}

async function excluirUsuario(id) {
  if (usuario.tipo !== "proprietario") {
    alert("Apenas o proprietário pode excluir usuários.");
    return;
  }
  if (id === usuario.id) {
    alert("Você não pode excluir o usuário da sessão atual.");
    return;
  }
  if (confirm("Excluir usuário?")) {
    await apiDelete("usuarios", id);
    mostrarMensagem("Usuário excluído.");
    carregar();
  }
}

document.querySelector("#formUsuario").addEventListener("submit", async e => {
  e.preventDefault();
  if (usuario.tipo !== "proprietario") return;
  const id = document.querySelector("#usuarioId").value;
  const tipo = document.querySelector("#usuarioTipo").value;
  const selecionadas = permissoes.filter(p => listaPermissoes.querySelector(`input[value="${p}"]`).checked);
  const dados = {
    id: id || `usr-${Date.now()}`,
    nome: document.querySelector("#usuarioNome").value.trim(),
    email: document.querySelector("#usuarioEmail").value.trim(),
    senha: document.querySelector("#usuarioSenha").value,
    tipo,
    ativo: document.querySelector("#usuarioAtivo").value === "true",
    permissoes: tipo === "proprietario" ? permissoes : selecionadas
  };
  await (id ? apiPut("usuarios", id, dados) : apiPost("usuarios", dados));
  bootstrap.Modal.getInstance(document.querySelector("#modalUsuario")).hide();
  mostrarMensagem("Usuário salvo.");
  carregar();
});

carregar();

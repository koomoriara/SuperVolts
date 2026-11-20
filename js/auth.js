const AUTH_KEY = "superVoltsUsuario";

async function fazerLogin(email, senha) {
  const usuarios = await apiGet("usuarios");
  const usuario = usuarios.find(item =>
    item.email.toLowerCase() === email.toLowerCase().trim() &&
    item.senha === senha &&
    item.ativo
  );
  if (!usuario) throw new Error("E-mail, senha ou usuário inválido.");
  const sessao = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    permissoes: usuario.permissoes || []
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(sessao));
  return sessao;
}

function obterUsuario() {
  const dados = sessionStorage.getItem(AUTH_KEY);
  return dados ? JSON.parse(dados) : null;
}

function exigirLogin() {
  const usuario = obterUsuario();
  if (!usuario) {
    window.location.href = "index.html";
    return null;
  }
  aplicarPermissoesMenu(usuario);
  return usuario;
}

function aplicarPermissoesMenu(usuario) {
  const textoPerfil = usuario.tipo === "proprietario" ? "PROPRIETÁRIO" : "GESTOR";
  const marcaPerfil = document.querySelector(".brand-text span");
  if (marcaPerfil) marcaPerfil.textContent = textoPerfil;
  const modulosPorLink = {
    "dashboard.html": "dashboard",
    "projetos.html": "projetos",
    "clientes.html": "clientes",
    "estoque.html": "estoque",
    "equipes.html": "equipes",
    "financeiro.html": "financeiro",
    "relatorios.html": "relatorios",
    "configuracoes.html": "configuracoes"
  };
  document.querySelectorAll(".sidebar-nav a[href]").forEach(link => {
    const arquivo = link.getAttribute("href");
    const modulo = modulosPorLink[arquivo];
    if (modulo && usuario.tipo !== "proprietario" && !(usuario.permissoes || []).includes(modulo)) {
      link.hidden = true;
    }
  });
}

function ehProprietario() {
  return obterUsuario()?.tipo === "proprietario";
}

function podeExcluirRegistros() {
  return ehProprietario();
}

function temPermissao(modulo) {
  const usuario = obterUsuario();
  return Boolean(usuario && (usuario.tipo === "proprietario" || (usuario.permissoes || []).includes(modulo)));
}

function exigirPermissao(modulo) {
  if (!temPermissao(modulo)) {
    window.location.href = "dashboard.html";
  }
}

function encerrarSessao() {
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = "index.html";
}

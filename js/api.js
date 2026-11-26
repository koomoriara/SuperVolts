const API_URL = (() => {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  return isLocal
    ? "http://127.0.0.1:3000"
    : "https://SUA-API.onrender.com"; // Troque pelo endereço gerado pelo Render.
})();

async function requisicaoApi(url, opcoes) {
  try {
    return await fetch(url, opcoes);
  } catch {
    throw new Error("Não foi possível conectar ao JSON Server. Inicie o servidor com npm start e tente novamente.");
  }
}

async function apiGet(collection, params = "") {
  const resposta = await requisicaoApi(`${API_URL}/${collection}${params}`);
  if (!resposta.ok) throw new Error("Não foi possível consultar os dados.");
  return resposta.json();
}

async function apiPost(collection, dados) {
  const resposta = await requisicaoApi(`${API_URL}/${collection}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Não foi possível cadastrar o registro.");
  return resposta.json();
}

async function apiPut(collection, id, dados) {
  const resposta = await requisicaoApi(`${API_URL}/${collection}/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Não foi possível atualizar o registro.");
  return resposta.json();
}

async function apiPutObject(collection, dados) {
  const resposta = await requisicaoApi(`${API_URL}/${collection}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Não foi possível atualizar o registro.");
  return resposta.json();
}

async function apiDelete(collection, id) {
  const resposta = await requisicaoApi(`${API_URL}/${collection}/${id}`, {method:"DELETE"});
  if (!resposta.ok) throw new Error("Não foi possível excluir o registro.");
  return true;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
}

function formatarData(valor) {
  if (!valor) return "-";
  const partes = valor.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
}

function mostrarMensagem(texto, tipo = "success") {
  const container = document.querySelector(".toast-container");
  if (!container) return;
  container.insertAdjacentHTML("beforeend", `
    <div class="toast align-items-center text-white bg-${tipo === "error" ? "danger" : "success"} border-0 show mb-2" role="alert">
      <div class="d-flex"><div class="toast-body">${texto}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>
    </div>`);
}

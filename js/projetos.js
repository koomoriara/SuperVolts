exigirLogin(); exigirPermissao("projetos");
const usuario = obterUsuario();
document.querySelector("#nomeUsuario").textContent = usuario.nome;
document.querySelector("#tipoUsuario").textContent = usuario.tipo === "proprietario" ? "Proprietário" : "Gestor";
document.querySelector("#sair").addEventListener("click", e => {e.preventDefault(); encerrarSessao();});
const sidebar = document.querySelector("#sidebar"), overlay = document.querySelector("#overlay");
document.querySelector("#menuToggle").addEventListener("click", () => {sidebar.classList.add("open"); overlay.classList.add("active");});
overlay.addEventListener("click", () => {sidebar.classList.remove("open"); overlay.classList.remove("active");});

let projetos = [], clientes = [];
const nomesEtapas = ["Contrato fechado","Análise técnica","Elaboração do projeto","Homologação junto à concessionária","Compra e recebimento dos equipamentos","Planejamento da instalação","Instalação","Vistoria e ativação","Projeto concluído"];

async function carregarProjetos() {
  try {
    [projetos, clientes] = await Promise.all([apiGet("projetos"), apiGet("clientes")]);
    preencherClientes();
    renderizarProjetos();
  } catch (erro) { mostrarMensagem("Erro ao carregar projetos: " + erro.message, "error"); }
}
function preencherClientes() {
  const opcoes = clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
  document.querySelector("#projetoCliente").innerHTML = '<option value="">Selecione</option>' + opcoes;
  document.querySelector("#filtroClienteProjeto").innerHTML = '<option value="">Todos os clientes</option>' + opcoes;
}
function nomeCliente(id) { return (clientes.find(c => c.id === id) || {}).nome || "Cliente não informado"; }
const FATOR_GERACAO_KWH_KWP_MES = 145;

function calcularValorProjeto() {
  const cliente = clientes.find(c => c.id === document.querySelector("#projetoCliente").value);
  const potencia = Number(document.querySelector("#projetoPotencia").value) || 0;
  const custoKwp = Number(document.querySelector("#projetoCustoKwp").value) || 0;
  const margem = Number(document.querySelector("#projetoMargem").value) || 0;
  const custoEstimado = potencia * custoKwp;
  const lucro = custoEstimado * (margem / 100);
  const valorContrato = custoEstimado + lucro;
  const consumo = cliente?.consumoMensal ? Number(cliente.consumoMensal) : 0;
  const tarifa = cliente?.tarifaKwh ? Number(cliente.tarifaKwh) : 0;
  document.querySelector("#projetoCustoEstimado").value = formatarMoeda(custoEstimado);
  document.querySelector("#projetoLucro").value = formatarMoeda(lucro);
  document.querySelector("#projetoValor").value = valorContrato ? valorContrato.toFixed(2) : "";
  document.querySelector("#projetoConsumoCliente").value = consumo ? `${consumo.toLocaleString("pt-BR")} kWh/mês` : "Não informado";
  document.querySelector("#projetoEconomia").value = consumo && tarifa ? formatarMoeda(consumo * tarifa) : "Não informado";
}

function atualizarDadosClienteProjeto() {
  const cliente = clientes.find(c => c.id === document.querySelector("#projetoCliente").value);
  if (cliente?.consumoMensal) {
    const potenciaSugerida = Number(cliente.consumoMensal) / FATOR_GERACAO_KWH_KWP_MES;
    document.querySelector("#projetoPotencia").value = potenciaSugerida.toFixed(2);
  }
  calcularValorProjeto();
}

["projetoCliente","projetoPotencia","projetoCustoKwp","projetoMargem"].forEach(id => {
  document.querySelector("#"+id).addEventListener(id === "projetoCliente" ? "change" : "input",
    id === "projetoCliente" ? atualizarDadosClienteProjeto : calcularValorProjeto);
});
function renderizarProjetos() {
  const busca = document.querySelector("#buscaProjeto").value.toLowerCase();
  const clienteId = document.querySelector("#filtroClienteProjeto").value;
  const situacao = document.querySelector("#filtroSituacaoProjeto").value;
  const data = document.querySelector("#filtroDataProjeto").value;
  const hoje = new Date();
  let lista = projetos.filter(p => (!busca || [p.codigo,p.observacoes].join(" ").toLowerCase().includes(busca)) &&
    (!clienteId || p.clienteId === clienteId) && (!situacao || p.situacao === situacao) &&
    (!data || p.dataContratacao === data));
  document.querySelector("#listaProjetos").innerHTML = lista.length ? lista.map(p => {
    const atrasado = p.situacao !== "Concluído" && p.situacao !== "Cancelado" && p.dataPrevista && new Date(p.dataPrevista+"T23:59:59") < hoje;
    return `<tr><td><strong>${p.codigo}</strong></td><td>${nomeCliente(p.clienteId)}</td><td>${formatarMoeda(p.valorContrato)}</td>
      <td><span class="badge-status ${atrasado ? "badge-danger" : p.situacao === "Concluído" ? "badge-success" : "badge-info"}">${atrasado ? "Atrasado" : p.situacao}</span></td>
      <td>${formatarData(p.dataPrevista)}</td><td>
      <button class="btn btn-sm btn-outline-primary me-1" onclick="verDetalhes('${p.id}')"><i class="bi bi-eye"></i></button>
      <button class="btn btn-sm btn-outline-secondary me-1" onclick="editarProjeto('${p.id}')"><i class="bi bi-pencil"></i></button>
      ${podeExcluirRegistros() ? `<button class="btn btn-sm btn-outline-danger" onclick="excluirProjeto('${p.id}')"><i class="bi bi-trash"></i></button>` : ""}</td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-state">Nenhum projeto encontrado.</td></tr>';
}
["buscaProjeto","filtroClienteProjeto","filtroSituacaoProjeto","filtroDataProjeto"].forEach(id => document.querySelector("#"+id).addEventListener(id === "buscaProjeto" ? "input" : "change", renderizarProjetos));

document.querySelector("#novoProjeto").addEventListener("click", () => {
  document.querySelector("#formProjeto").reset(); document.querySelector("#projetoId").value = "";
  document.querySelector("#projetoContratacao").value = new Date().toISOString().slice(0,10);
  const ano = new Date().getFullYear();
  const sequencia = projetos.length + 1;
  document.querySelector("#projetoCodigo").value = `SV-${ano}-${String(sequencia).padStart(3,"0")}`;
  document.querySelector("#projetoCustoKwp").value = "3000";
  document.querySelector("#projetoMargem").value = "30";
  document.querySelector("#projetoPotencia").value = "";
  calcularValorProjeto();
});
function editarProjeto(id) {
  const p = projetos.find(item => item.id === id); if (!p) return;
  document.querySelector("#projetoId").value=p.id; document.querySelector("#projetoCodigo").value=p.codigo;
  document.querySelector("#projetoCliente").value=p.clienteId;
  document.querySelector("#projetoPotencia").value=p.potenciaKwp || "";
  document.querySelector("#projetoCustoKwp").value=p.custoPorKwp || 3000;
  document.querySelector("#projetoMargem").value=p.margemLucro ?? 30;
  document.querySelector("#projetoValor").value=p.valorContrato;
  document.querySelector("#projetoContratacao").value=p.dataContratacao; document.querySelector("#projetoPrevista").value=p.dataPrevista;
  document.querySelector("#projetoResponsavel").value=p.responsavel; document.querySelector("#projetoSituacao").value=p.situacao;
  document.querySelector("#projetoConclusao").value=p.dataConclusao || ""; document.querySelector("#projetoObservacoes").value=p.observacoes || "";
  calcularValorProjeto();
  bootstrap.Modal.getOrCreateInstance(document.querySelector("#modalProjeto")).show();
}
async function excluirProjeto(id) {
  if (!podeExcluirRegistros()) { alert("Apenas o proprietário pode excluir projetos."); return; }
  const vinculos = await Promise.all([apiGet("receitas"),apiGet("despesas"),apiGet("atividades"),apiGet("movimentacoes")]);
  if (vinculos.some(lista => lista.some(item => item.projetoId === id))) { alert("Este projeto possui registros vinculados e não pode ser excluído."); return; }
  if (!confirm("Deseja excluir este projeto?")) return;
  try { await apiDelete("projetos",id); mostrarMensagem("Projeto excluído."); await carregarProjetos(); } catch(erro) {mostrarMensagem(erro.message,"error");}
}
document.querySelector("#formProjeto").addEventListener("submit", async e => {
  e.preventDefault();
  const clienteId = document.querySelector("#projetoCliente").value;
  const potencia = Number(document.querySelector("#projetoPotencia").value);
  const custoPorKwp = Number(document.querySelector("#projetoCustoKwp").value);
  const margemLucro = Number(document.querySelector("#projetoMargem").value);
  if (!clienteId) { mostrarMensagem("Selecione o cliente do projeto.", "error"); return; }
  if (potencia <= 0 || custoPorKwp <= 0) { mostrarMensagem("Informe potência e custo por kWp válidos.", "error"); return; }
  if (margemLucro < 0 || margemLucro > 100) { mostrarMensagem("A margem de lucro deve estar entre 0% e 100%.", "error"); return; }
  const id=document.querySelector("#projetoId").value;
  const anterior=projetos.find(p=>p.id===id);
  const etapas=anterior?.etapas?.length ? anterior.etapas : nomesEtapas.map((nome,i)=>({nome,situacao:i===0?"concluida":"não iniciada",dataInicio:"",dataConclusao:"",responsavel:"",observacoes:"",dependencia:"empresa"}));
  calcularValorProjeto();
  const custoEstimado = potencia * custoPorKwp;
  const lucroPrevisto = custoEstimado * (margemLucro / 100);
  const dados={id:id||`prj-${Date.now()}`,codigo:document.querySelector("#projetoCodigo").value.trim(),clienteId:document.querySelector("#projetoCliente").value,
    potenciaKwp:potencia,custoPorKwp,margemLucro,custoEstimado,lucroPrevisto,
    valorContrato:Number(document.querySelector("#projetoValor").value),dataContratacao:document.querySelector("#projetoContratacao").value,
    responsavel:document.querySelector("#projetoResponsavel").value.trim(),dataPrevista:document.querySelector("#projetoPrevista").value,
    dataConclusao:document.querySelector("#projetoConclusao").value||null,situacao:document.querySelector("#projetoSituacao").value,
    observacoes:document.querySelector("#projetoObservacoes").value.trim(),etapas,historicoEtapas:anterior?.historicoEtapas||[]};
  try { if(id) await apiPut("projetos",id,dados); else await apiPost("projetos",dados);
    bootstrap.Modal.getInstance(document.querySelector("#modalProjeto")).hide(); mostrarMensagem(id?"Projeto atualizado.":"Projeto cadastrado."); await carregarProjetos();
  } catch(erro) {mostrarMensagem(erro.message,"error");}
});

function verDetalhes(id) {
  const p=projetos.find(item=>item.id===id); if(!p)return;
  const etapas=p.etapas?.length?p.etapas:nomesEtapas.map(nome=>({nome,situacao:"não iniciada",responsavel:"",dependencia:"empresa",observacoes:"",dataInicio:"",dataConclusao:""}));
  document.querySelector("#tituloDetalhes").textContent=`${p.codigo} - ${nomeCliente(p.clienteId)}`;
  const concluidas=etapas.filter(e=>e.situacao==="concluida").length;
  const progresso=Math.round((concluidas/etapas.length)*100);
  document.querySelector("#conteudoDetalhes").innerHTML=`<div class="mb-3"><strong>Progresso: ${progresso}%</strong><div class="progress mt-2"><div class="progress-bar" style="width:${progresso}%"></div></div></div>
  <div class="table-responsive"><table class="table"><thead><tr><th>Etapa</th><th>Situação</th><th>Responsável</th><th>Dependência</th><th>Datas</th></tr></thead><tbody>${etapas.map((e,i)=>`<tr><td>${e.nome}</td><td><select class="form-select form-select-sm" onchange="atualizarEtapa('${p.id}',${i},this.value)">
  ${["não iniciada","em andamento","concluida","pendente"].map(s=>`<option ${e.situacao===s?"selected":""} value="${s}">${s}</option>`).join("")}</select></td><td><input class="form-control form-control-sm" value="${e.responsavel||""}" onchange="atualizarResponsavelEtapa('${p.id}',${i},this.value)"></td><td><select class="form-select form-select-sm" onchange="atualizarDependenciaEtapa('${p.id}',${i},this.value)"><option ${e.dependencia==="empresa"?"selected":""}>empresa</option><option ${e.dependencia==="concessionaria"?"selected":""}>concessionaria</option><option ${e.dependencia==="fornecedor"?"selected":""}>fornecedor</option><option ${e.dependencia==="terceiros"?"selected":""}>terceiros</option></select></td><td>${formatarData(e.dataInicio)} - ${formatarData(e.dataConclusao)}</td></tr>`).join("")}</tbody></table></div>`;
  bootstrap.Modal.getOrCreateInstance(document.querySelector("#modalDetalhes")).show();
}
async function atualizarEtapa(id,i,situacao) {
  const p=projetos.find(item=>item.id===id); p.etapas[i].situacao=situacao;
  if(situacao==="concluida"&&!p.etapas[i].dataConclusao)p.etapas[i].dataConclusao=new Date().toISOString().slice(0,10);
  if(situacao==="em andamento"&&!p.etapas[i].dataInicio)p.etapas[i].dataInicio=new Date().toISOString().slice(0,10);
  p.historicoEtapas.push({etapa:p.etapas[i].nome,situacao,data:new Date().toISOString(),usuario:usuario.nome});
  try{await apiPut("projetos",id,p);mostrarMensagem("Etapa atualizada.");verDetalhes(id);}catch(erro){mostrarMensagem(erro.message,"error");}
}
async function atualizarResponsavelEtapa(id,i,valor){const p=projetos.find(item=>item.id===id);p.etapas[i].responsavel=valor;await apiPut("projetos",id,p);}
async function atualizarDependenciaEtapa(id,i,valor){const p=projetos.find(item=>item.id===id);p.etapas[i].dependencia=valor;await apiPut("projetos",id,p);mostrarMensagem("Dependência atualizada.");}
carregarProjetos();

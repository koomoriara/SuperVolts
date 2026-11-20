const usuario = exigirLogin();
if (!usuario) {
  throw new Error("É necessário entrar no sistema para visualizar o dashboard.");
}

document.querySelector("#nomeUsuario").textContent = usuario.nome;
document.querySelector("#tipoUsuario").textContent = usuario.tipo === "proprietario" ? "Proprietário" : "Gestor";
document.querySelector("#saudacaoDashboard").textContent = usuario.tipo === "proprietario" ? "Bem-vindo, Proprietário" : "Bem-vindo, Gestor";
if (!ehProprietario() && !(usuario.permissoes || []).includes("financeiro")) {
  document.querySelector("#resultadoFinanceiro")?.closest(".dashboard-section")?.setAttribute("hidden", "");
  document.querySelector(".finance-chart-panel")?.setAttribute("hidden", "");
}
document.querySelector("#sair").addEventListener("click", evento => {
  evento.preventDefault();
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

const formatoDataCurta = new Intl.DateTimeFormat("pt-BR", {day:"2-digit", month:"2-digit", year:"numeric"});
const normalizarTexto = texto => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let dadosDashboard;
let graficoProjetos;
let graficoFinanceiro;
let graficoSituacoes;

function dataLocalISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function inicializarPeriodo() {
  const hoje = new Date();
  document.querySelector("#periodoInicio").value = `${hoje.getFullYear()}-01-01`;
  document.querySelector("#periodoFim").value = `${hoje.getFullYear()}-12-31`;
  document.querySelector("#filtroPeriodo").addEventListener("submit", evento => {
    evento.preventDefault();
    atualizarDashboard();
  });
}

function dentroDoPeriodo(data, inicio, fim) {
  return Boolean(data && data >= inicio && data <= fim);
}

function obterMes(data) {
  return data ? data.slice(0, 7) : "";
}

function criarMesesRotulados(meses) {
  return meses.map(mes => {
    const [ano, numeroMes] = mes.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {month:"short", year:"2-digit"})
      .format(new Date(ano, numeroMes - 1, 1));
  });
}

function formatarDataCurta(data) {
  return data ? formatoDataCurta.format(new Date(`${data}T12:00:00`)) : "Data não informada";
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[caractere]);
}

async function carregarDadosDashboard() {
  try {
    const [projetos, clientes, receitas, despesas, produtos, atividades] = await Promise.all([
      apiGet("projetos"),
      apiGet("clientes"),
      apiGet("receitas"),
      apiGet("despesas"),
      apiGet("produtos"),
      apiGet("atividades")
    ]);
    dadosDashboard = {projetos, clientes, receitas, despesas, produtos, atividades};
    inicializarPeriodo();
    atualizarDashboard();
  } catch (erro) {
    mostrarMensagem("Erro ao carregar o dashboard: " + erro.message, "error");
  }
}

function atualizarDashboard() {
  const inicio = document.querySelector("#periodoInicio").value;
  const fim = document.querySelector("#periodoFim").value;
  if (!inicio || !fim || inicio > fim) {
    mostrarMensagem("Informe um período válido: a data inicial deve ser anterior à data final.", "error");
    return;
  }

  const {projetos, receitas, despesas, produtos, atividades} = dadosDashboard;
  const projetosDoPeriodo = projetos.filter(projeto => dentroDoPeriodo(projeto.dataContratacao, inicio, fim));
  const hoje = dataLocalISO(new Date());
  const projetosAbertos = projetosDoPeriodo.filter(projeto =>
    !["concluido", "cancelado"].includes(normalizarTexto(projeto.situacao))
  );
  const projetosAndamento = projetosDoPeriodo.filter(projeto =>
    normalizarTexto(projeto.situacao) === "em andamento"
  );
  const projetosConcluidos = projetos.filter(projeto =>
    normalizarTexto(projeto.situacao) === "concluido" &&
    dentroDoPeriodo(projeto.dataConclusao, inicio, fim)
  );
  const projetosAtrasados = projetosAbertos.filter(projeto =>
    projeto.dataPrevista && projeto.dataPrevista < hoje
  );
  const projetosEmHomologacao = projetosDoPeriodo.filter(aguardaHomologacao);

  const receitasRecebidas = receitas.filter(receita =>
    normalizarTexto(receita.situacao) === "recebido" &&
    dentroDoPeriodo(receita.recebimento, inicio, fim)
  );
  const despesasPagas = despesas.filter(despesa =>
    normalizarTexto(despesa.situacao) === "pago" &&
    dentroDoPeriodo(despesa.pagamento, inicio, fim)
  );
  const recebimentosPendentes = receitas.filter(receita =>
    !["recebido", "cancelado"].includes(normalizarTexto(receita.situacao)) &&
    dentroDoPeriodo(receita.vencimento, inicio, fim)
  );

  document.querySelector("#totalProjetos").textContent = projetosDoPeriodo.length;
  document.querySelector("#projetosAndamento").textContent = projetosAndamento.length;
  document.querySelector("#projetosConcluidos").textContent = projetosConcluidos.length;
  document.querySelector("#projetosAtrasados").textContent = projetosAtrasados.length;
  document.querySelector("#projetosHomologacao").textContent = projetosEmHomologacao.length;
  document.querySelector("#faturamentoPeriodo").textContent = formatarMoeda(somarValores(receitasRecebidas));
  document.querySelector("#despesasPeriodo").textContent = formatarMoeda(somarValores(despesasPagas));
  document.querySelector("#pendenteRecebimento").textContent = formatarMoeda(somarValores(recebimentosPendentes));
  document.querySelector("#resultadoFinanceiro").textContent =
    formatarMoeda(somarValores(receitasRecebidas) - somarValores(despesasPagas));
  document.querySelector("#periodoSelecionado").textContent =
    `${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}`;

  renderizarGraficos(projetos, projetosDoPeriodo, receitas, despesas, inicio, fim);
  renderizarProjetosRecentes(projetosDoPeriodo, dadosDashboard.clientes, hoje);
  renderizarAlertas(projetosAtrasados, projetosEmHomologacao, recebimentosPendentes, produtos, atividades, inicio, fim);
}

function somarValores(registros) {
  return registros.reduce((total, registro) => total + Number(registro.valor || 0), 0);
}

function aguardaHomologacao(projeto) {
  const situacao = normalizarTexto(projeto.situacao);
  if (["concluido", "cancelado"].includes(situacao)) return false;
  if (situacao === "aguardando homologacao") return true;
  const etapa = (projeto.etapas || []).find(item => normalizarTexto(item.nome).includes("homolog"));
  return Boolean(etapa && ["em andamento", "pendente", "aguardando"].includes(normalizarTexto(etapa.situacao)));
}

function toggleGrafico(canvasId, vazioId, mostrar) {
  document.querySelector(`#${canvasId}`).hidden = !mostrar;
  document.querySelector(`#${vazioId}`).hidden = mostrar;
}

function renderizarGraficos(projetos, projetosDoPeriodo, receitas, despesas, inicio, fim) {
  const projetosConcluidosNoPeriodo = projetos.filter(projeto =>
    normalizarTexto(projeto.situacao) === "concluido" &&
    dentroDoPeriodo(projeto.dataConclusao, inicio, fim)
  );
  const receitasDoPeriodo = receitas.filter(receita =>
    normalizarTexto(receita.situacao) === "recebido" &&
    dentroDoPeriodo(receita.recebimento, inicio, fim)
  );
  const despesasDoPeriodo = despesas.filter(despesa =>
    normalizarTexto(despesa.situacao) === "pago" &&
    dentroDoPeriodo(despesa.pagamento, inicio, fim)
  );
  const meses = [...new Set([
    ...projetosDoPeriodo.map(projeto => obterMes(projeto.dataContratacao)),
    ...projetosConcluidosNoPeriodo.map(projeto => obterMes(projeto.dataConclusao)),
    ...receitasDoPeriodo.map(receita => obterMes(receita.recebimento)),
    ...despesasDoPeriodo.map(despesa => obterMes(despesa.pagamento))
  ].filter(Boolean))].sort();
  const rotulos = criarMesesRotulados(meses);

  if (graficoProjetos) graficoProjetos.destroy();
  toggleGrafico("graficoProjetos", "vazioGraficoProjetos", projetosDoPeriodo.length > 0);
  if (projetosDoPeriodo.length) {
    const contratosPorMes = meses.map(mes =>
      projetosDoPeriodo.filter(projeto => obterMes(projeto.dataContratacao) === mes).length
    );
    const concluidosPorMes = meses.map(mes =>
      projetosConcluidosNoPeriodo.filter(projeto => obterMes(projeto.dataConclusao) === mes).length
    );
    let totalConcluido = 0;
    const acumuladoConcluidos = concluidosPorMes.map(quantidade => (totalConcluido += quantidade));
    graficoProjetos = new Chart(document.querySelector("#graficoProjetos"), {
      data: {
        labels: rotulos,
        datasets: [
          {type:"bar", label:"Contratados", data:contratosPorMes, backgroundColor:"#35a9d1", borderRadius:5, maxBarThickness:24},
          {type:"bar", label:"Concluídos", data:concluidosPorMes, backgroundColor:"#244f87", borderRadius:5, maxBarThickness:24},
          {type:"line", label:"Conclusões acumuladas", data:acumuladoConcluidos, borderColor:"#f28a32", backgroundColor:"rgba(242,138,50,.12)", tension:.38, fill:false, pointRadius:3}
        ]
      },
      options: {
        responsive:true,
        maintainAspectRatio:false,
        interaction:{mode:"index", intersect:false},
        plugins:{legend:{position:"bottom", labels:{usePointStyle:true, boxWidth:7, padding:16}}},
        scales:{y:{beginAtZero:true, ticks:{precision:0}, grid:{color:"#e8edf3"}}, x:{grid:{display:false}}}
      }
    });
  }

  if (graficoFinanceiro) graficoFinanceiro.destroy();
  const temMovimentos = receitasDoPeriodo.length > 0 || despesasDoPeriodo.length > 0;
  toggleGrafico("graficoFinanceiro", "vazioGraficoFinanceiro", temMovimentos);
  if (temMovimentos) {
    const valoresReceitas = meses.map(mes =>
      somarValores(receitasDoPeriodo.filter(receita => obterMes(receita.recebimento) === mes))
    );
    const valoresDespesas = meses.map(mes =>
      somarValores(despesasDoPeriodo.filter(despesa => obterMes(despesa.pagamento) === mes))
    );
    graficoFinanceiro = new Chart(document.querySelector("#graficoFinanceiro"), {
      data: {
        labels:rotulos,
        datasets:[
          {type:"bar", label:"Recebido", data:valoresReceitas, backgroundColor:"#278cc5", borderRadius:5, maxBarThickness:24},
          {type:"bar", label:"Pago", data:valoresDespesas, backgroundColor:"#f28a32", borderRadius:5, maxBarThickness:24},
          {type:"line", label:"Resultado", data:valoresReceitas.map((valor, indice) => valor - valoresDespesas[indice]), borderColor:"#183f78", backgroundColor:"rgba(36,120,223,.12)", tension:.35, pointRadius:3}
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        interaction:{mode:"index", intersect:false},
        plugins:{
          legend:{position:"bottom", labels:{usePointStyle:true, boxWidth:7, padding:14}},
          tooltip:{callbacks:{label:context => `${context.dataset.label}: ${formatarMoeda(context.raw)}`}}
        },
        scales:{y:{beginAtZero:true, grid:{color:"#e8edf3"}, ticks:{callback:valor => formatarMoeda(valor)}}, x:{grid:{display:false}}}
      }
    });
  }

  if (graficoSituacoes) graficoSituacoes.destroy();
  const situacoes = [...new Set(projetosDoPeriodo.map(projeto => projeto.situacao || "Não informado"))];
  toggleGrafico("graficoSituacoes", "vazioGraficoSituacoes", situacoes.length > 0);
  if (situacoes.length) {
    const cores = ["#258cc5", "#f28a32", "#ffc44d", "#20a66a", "#345d93", "#dc4a4a", "#7d8799"];
    graficoSituacoes = new Chart(document.querySelector("#graficoSituacoes"), {
      type:"doughnut",
      data:{
        labels:situacoes,
        datasets:[{data:situacoes.map(situacao => projetosDoPeriodo.filter(projeto => projeto.situacao === situacao).length), backgroundColor:situacoes.map((_, indice) => cores[indice % cores.length]), borderWidth:0, hoverOffset:5}]
      },
      options:{responsive:true, maintainAspectRatio:false, cutout:"68%", plugins:{legend:{position:"bottom", labels:{usePointStyle:true, boxWidth:7, padding:13}}}}
    });
  }
}

function renderizarProjetosRecentes(projetos, clientes, hoje) {
  const alvo = document.querySelector("#listaProjetosRecentes");
  const recentes = [...projetos]
    .sort((a, b) => (b.dataContratacao || "").localeCompare(a.dataContratacao || ""))
    .slice(0, 4);
  if (!recentes.length) {
    alvo.innerHTML = '<div class="empty-state">Nenhum projeto contratado no período selecionado.</div>';
    return;
  }

  alvo.innerHTML = `<div class="recent-list">${recentes.map(projeto => {
    const cliente = clientes.find(item => item.id === projeto.clienteId);
    const atrasado = projeto.situacao !== "Concluído" && projeto.situacao !== "Cancelado" &&
      projeto.dataPrevista && projeto.dataPrevista < hoje;
    const estadoClass = atrasado ? "status-late" : projeto.situacao === "Concluído" ? "status-done" : "";
    const etapas = projeto.etapas || [];
    const concluidas = etapas.filter(etapa => normalizarTexto(etapa.situacao).startsWith("concluid")).length;
    const progresso = projeto.situacao === "Concluído" ? 100 : etapas.length ? Math.round(concluidas / etapas.length * 100) : 0;
    return `<article class="recent-project">
      <strong class="recent-project-name">${escaparHTML(projeto.codigo || "Projeto")}</strong>
      <span class="recent-project-value">${formatarMoeda(projeto.valorContrato)}</span>
      <span class="recent-project-client">${escaparHTML(cliente?.nome || "Cliente não informado")}</span>
      <div class="recent-project-meta">
        <span class="recent-status ${estadoClass}">${atrasado ? "Atrasado" : escaparHTML(projeto.situacao || "Não informado")}</span>
        <small>${progresso}% · ${formatarDataCurta(projeto.dataPrevista)}</small>
      </div>
      <div class="recent-progress"><span style="width:${progresso}%"></span></div>
    </article>`;
  }).join("")}</div>`;
}

function renderizarAlertas(atrasados, homologacao, recebimentos, produtos, atividades, inicio, fim) {
  const alertas = [];
  const baixoEstoque = produtos.filter(produto => Number(produto.quantidade) <= Number(produto.quantidadeMinima));
  const atividadesProximas = atividades.filter(atividade =>
    atividade.situacao !== "Concluída" &&
    atividade.prazo >= inicio && atividade.prazo <= fim &&
    atividade.prazo >= dataLocalISO(new Date()) &&
    atividade.prazo <= dataLocalISO(new Date(Date.now() + 7 * 86400000))
  );

  if (atrasados.length) alertas.push({icone:"bi-exclamation-triangle", classe:"alert-danger", texto:`${atrasados.length} projeto(s) com prazo ultrapassado.`});
  if (homologacao.length) alertas.push({icone:"bi-hourglass-split", classe:"", texto:`${homologacao.length} projeto(s) aguardando homologação.`});
  if (recebimentos.length) alertas.push({icone:"bi-cash-coin", classe:"", texto:`${formatarMoeda(somarValores(recebimentos))} em recebimentos pendentes no período.`});
  if (baixoEstoque.length) alertas.push({icone:"bi-box-seam", classe:"alert-danger", texto:`${baixoEstoque.length} produto(s) no limite ou abaixo do estoque mínimo.`});
  if (atividadesProximas.length) alertas.push({icone:"bi-calendar-check", classe:"", texto:`${atividadesProximas.length} atividade(s) vencem nos próximos 7 dias.`});

  const alvo = document.querySelector("#listaAlertas");
  alvo.innerHTML = alertas.length
    ? alertas.map(alerta => `<div class="dashboard-alert ${alerta.classe}"><i class="bi ${alerta.icone}"></i><span>${escaparHTML(alerta.texto)}</span></div>`).join("")
    : '<div class="empty-state">Nenhuma pendência importante no momento.</div>';
}

carregarDadosDashboard();

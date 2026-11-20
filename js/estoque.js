exigirLogin();exigirPermissao("estoque");const usuario=obterUsuario();document.querySelector("#nomeUsuario").textContent=usuario.nome;document.querySelector("#tipoUsuario").textContent=usuario.tipo==="proprietario"?"Proprietário":"Gestor";
document.querySelector("#sair").addEventListener("click",e=>{e.preventDefault();encerrarSessao()});const sidebar=document.querySelector("#sidebar"),overlay=document.querySelector("#overlay");document.querySelector("#menuToggle").addEventListener("click",()=>{sidebar.classList.add("open");overlay.classList.add("active")});overlay.addEventListener("click",()=>{sidebar.classList.remove("open");overlay.classList.remove("active")});
let produtos=[],movimentacoes=[],projetos=[];
if(!ehProprietario())document.querySelector("#novoProduto").hidden=true;
const categoriaEstoque={
  "Kits fotovoltaicos":{codigo:"KIT",preco:14500,unidade:"kit"},
  "Módulos solares":{codigo:"MOD",preco:950,unidade:"un"},
  "Inversores":{codigo:"INV",preco:5200,unidade:"un"},
  "Estruturas de fixação":{codigo:"EST",preco:420,unidade:"conjunto"},
  "Cabos e conectores":{codigo:"CAB",preco:8,unidade:"m"},
  "Proteção elétrica":{codigo:"PROT",preco:260,unidade:"un"},
  "Baterias":{codigo:"BAT",preco:2900,unidade:"un"},
  "Controladores de carga":{codigo:"CTRL",preco:1800,unidade:"un"}
};
function gerarCodigoCategoria(categoria){
  const config=categoriaEstoque[categoria]||{codigo:"PROD"};
  const prefixo=config.codigo+"-";
  const numeros=produtos.filter(p=>p.categoria===categoria).map(p=>{
    const partes=String(p.codigo||"").match(/-(\d+)$/);
    return partes?Number(partes[1]):0;
  });
  const proximo=Math.max(0,...numeros)+1;
  return `${config.codigo}-${String(proximo).padStart(3,"0")}`;
}
function atualizarProdutoAutomatico(){
  const categoria=document.querySelector("#produtoCategoria").value;
  const config=categoriaEstoque[categoria];
  if(!document.querySelector("#produtoId").value){
    document.querySelector("#produtoCodigo").value=gerarCodigoCategoria(categoria);
  }
  if(config){
    document.querySelector("#produtoPreco").value=config.preco;
    document.querySelector("#produtoUnidade").value=config.unidade;
  }
}
async function carregar(){try{[produtos,movimentacoes,projetos]=await Promise.all([apiGet("produtos"),apiGet("movimentacoes"),apiGet("projetos")]);preencher();renderizar()}catch(e){mostrarMensagem("Erro ao carregar estoque: "+e.message,"error")}}
function preencher(){const categorias=[...new Set(produtos.map(p=>p.categoria))];document.querySelector("#filtroCategoria").innerHTML='<option value="">Todas as categorias</option>'+categorias.map(c=>`<option>${c}</option>`).join("");document.querySelector("#movProduto").innerHTML='<option value="">Selecione</option>'+produtos.map(p=>`<option value="${p.id}">${p.nome} (${p.quantidade} ${p.unidade})</option>`).join("");document.querySelector("#movProjeto").innerHTML='<option value="">Não vinculado</option>'+projetos.map(p=>`<option value="${p.id}">${p.codigo}</option>`).join("")}
function nomeProduto(id){return(produtos.find(p=>p.id===id)||{}).nome||"-"}function nomeProjeto(id){return(projetos.find(p=>p.id===id)||{}).codigo||"-"}
function renderizar(){const busca=document.querySelector("#buscaProduto").value.toLowerCase(),categoria=document.querySelector("#filtroCategoria").value;const lista=produtos.filter(p=>(!busca||[p.nome,p.codigo].join(" ").toLowerCase().includes(busca))&&(!categoria||p.categoria===categoria));
const baixoEstoque=produtos.filter(p=>Number(p.quantidade)<=Number(p.quantidadeMinima)).length;
const fornecedores=new Set(produtos.map(p=>p.fornecedor).filter(Boolean)).size;
const valorEstoque=produtos.reduce((total,p)=>total+(Number(p.quantidade)*Number(p.precoCompra||0)),0);
document.querySelector("#estoqueQtdProdutos").textContent=produtos.length;
document.querySelector("#estoqueQtdBaixa").textContent=baixoEstoque;
document.querySelector("#estoqueQtdFornecedores").textContent=fornecedores;
document.querySelector("#estoqueValor").textContent=formatarMoeda(valorEstoque);
const totaisPorCategoria={};
produtos.forEach(p=>{
  if(!totaisPorCategoria[p.categoria])totaisPorCategoria[p.categoria]={quantidade:0,valor:0,codigos:new Set()};
  totaisPorCategoria[p.categoria].quantidade+=Number(p.quantidade||0);
  totaisPorCategoria[p.categoria].valor+=Number(p.quantidade||0)*Number(p.precoCompra||0);
  totaisPorCategoria[p.categoria].codigos.add(p.codigo);
});
document.querySelector("#estoqueCategorias").innerHTML=Object.entries(totaisPorCategoria).map(([categoria,total])=>{
  const codigo=categoriaEstoque[categoria]?.codigo||"PROD";
  return `<article class="estoque-categoria"><span class="categoria-codigo">${codigo} · ${total.quantidade} unidades</span><strong>${categoria}</strong><span>${formatarMoeda(total.valor)}</span></article>`;
}).join("");
document.querySelector("#listaProdutos").innerHTML=lista.length?`<div class="table-responsive"><table class="table"><thead><tr><th>Produto</th><th>Código</th><th>Categoria</th><th>Disponível</th><th>Mínimo</th><th>Fornecedor</th><th>Ações</th></tr></thead><tbody>${lista.map(p=>{const baixo=Number(p.quantidade)<=Number(p.quantidadeMinima);return`<tr><td>${p.nome}</td><td>${p.codigo}</td><td>${p.categoria}</td><td><span class="badge-status ${baixo?"badge-danger":"badge-success"}">${p.quantidade} ${p.unidade}</span></td><td>${p.quantidadeMinima}</td><td>${p.fornecedor}</td><td>${podeExcluirRegistros()?`<button class="btn btn-sm btn-outline-primary me-1" onclick="editarProduto('${p.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="excluirProduto('${p.id}')"><i class="bi bi-trash"></i></button>`:"<span class=\"text-muted\">Consulta</span>"}</td></tr>`}).join("")}</tbody></table></div>`:'<div class="empty-state">Nenhum produto encontrado.</div>';
document.querySelector("#listaMovimentacoes").innerHTML=movimentacoes.length?`<div class="table-responsive"><table class="table"><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Projeto</th><th>Observação</th></tr></thead><tbody>${[...movimentacoes].reverse().map(m=>`<tr><td>${formatarData(m.data)}</td><td>${nomeProduto(m.produtoId)}</td><td><span class="badge-status ${m.tipo==="entrada"?"badge-success":"badge-warning"}">${m.tipo}</span></td><td>${m.quantidade}</td><td>${m.projetoId?nomeProjeto(m.projetoId):"-"}</td><td>${m.observacoes||"-"}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty-state">Nenhuma movimentação registrada.</div>'}
document.querySelector("#buscaProduto").addEventListener("input",renderizar);document.querySelector("#filtroCategoria").addEventListener("change",renderizar);
document.querySelector("#novoProduto").addEventListener("click",()=>{document.querySelector("#formProduto").reset();document.querySelector("#produtoId").value="";document.querySelector("#produtoQuantidade").value=0;document.querySelector("#produtoMinimo").value=0;atualizarProdutoAutomatico()});
document.querySelector("#produtoCategoria").addEventListener("change",atualizarProdutoAutomatico);
function editarProduto(id){const p=produtos.find(x=>x.id===id);if(!p)return;document.querySelector("#produtoId").value=p.id;document.querySelector("#produtoNome").value=p.nome;document.querySelector("#produtoCodigo").value=p.codigo;document.querySelector("#produtoCategoria").value=p.categoria;document.querySelector("#produtoQuantidade").value=p.quantidade;document.querySelector("#produtoUnidade").value=p.unidade;document.querySelector("#produtoMinimo").value=p.quantidadeMinima;document.querySelector("#produtoPreco").value=p.precoCompra;document.querySelector("#produtoFornecedor").value=p.fornecedor;bootstrap.Modal.getOrCreateInstance(document.querySelector("#modalProduto")).show()}
async function excluirProduto(id){if(!podeExcluirRegistros()){alert("Apenas o proprietário pode excluir produtos.");return}if(movimentacoes.some(m=>m.produtoId===id)){alert("Produto possui movimentações vinculadas.");return}if(confirm("Excluir produto?")){await apiDelete("produtos",id);mostrarMensagem("Produto excluído.");carregar()}}
document.querySelector("#formProduto").addEventListener("submit",async e=>{e.preventDefault();if(!podeExcluirRegistros())return;const id=document.querySelector("#produtoId").value,dados={id:id||`prod-${Date.now()}`,nome:document.querySelector("#produtoNome").value.trim(),codigo:document.querySelector("#produtoCodigo").value.trim(),categoria:document.querySelector("#produtoCategoria").value.trim(),quantidade:Number(document.querySelector("#produtoQuantidade").value),unidade:document.querySelector("#produtoUnidade").value.trim(),quantidadeMinima:Number(document.querySelector("#produtoMinimo").value),precoCompra:Number(document.querySelector("#produtoPreco").value),fornecedor:document.querySelector("#produtoFornecedor").value.trim()};await(id?apiPut("produtos",id,dados):apiPost("produtos",dados));bootstrap.Modal.getInstance(document.querySelector("#modalProduto")).hide();mostrarMensagem("Produto salvo.");carregar()});
document.querySelector("#novaMovimentacao").addEventListener("click",()=>document.querySelector("#formMovimentacao").reset());
document.querySelector("#formMovimentacao").addEventListener("submit",async e=>{e.preventDefault();const pid=document.querySelector("#movProduto").value,tipo=document.querySelector("#movTipo").value,qtd=Number(document.querySelector("#movQuantidade").value),p=produtos.find(x=>x.id===pid);if(!p){mostrarMensagem("Selecione um produto.","error");return}if(tipo==="saida"&&qtd>Number(p.quantidade)){mostrarMensagem("Saída não pode deixar o estoque negativo.","error");return}p.quantidade=tipo==="entrada"?Number(p.quantidade)+qtd:Number(p.quantidade)-qtd;await apiPut("produtos",pid,p);const mov={id:`mov-${Date.now()}`,produtoId:pid,tipo,quantidade:qtd,projetoId:document.querySelector("#movProjeto").value||null,data:new Date().toISOString().slice(0,10),observacoes:document.querySelector("#movObservacoes").value.trim()};await apiPost("movimentacoes",mov);bootstrap.Modal.getInstance(document.querySelector("#modalMovimentacao")).hide();mostrarMensagem("Movimentação registrada.");carregar()});
carregar();

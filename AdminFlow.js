// ==========================================
// CONFIGURAÇÕES DAS APIS
// ==========================================

const API = "https://flow-core-api.onrender.com";

// API nova da Flow Core Automation.
// Localmente, use esta URL. Depois substituiremos pela URL do Render.
const API_AUTOMATION = "http://127.0.0.1:8000";

let token = localStorage.getItem("tokenAdminFlow");

let credenciaisAutomation = null;

let dados = {
    clientes: [],
    produtos: [],
    compras: [],
    assinaturas: [],
    pagamentos: [],
    avaliacoes: [],
    licencas: []
};

const $ = (id) => document.getElementById(id);

let temporizadorMensagem = null;


// ==========================================
// UTILITÁRIOS
// ==========================================

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function dinheiro(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function dataFormatada(valor) {
    if (!valor) return "—";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return "—";

    return data.toLocaleDateString("pt-BR");
}

function dataHoraFormatada(valor) {
    if (!valor) return "—";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return "—";

    return data.toLocaleString("pt-BR");
}

function atualizarDataAtual() {
    const agora = new Date();

    $("dataAtual").textContent = agora.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function statusHTML(status) {
    const texto = String(status || "indefinido").toLowerCase();
    const classe = texto.replace(/[^a-z0-9_-]/g, "");

    return `<span class="status ${classe}">${escapar(status || "Indefinido")}</span>`;
}

function mensagem(texto) {
    const elemento = $("mensagem");

    elemento.textContent = texto;
    elemento.classList.add("show");

    clearTimeout(temporizadorMensagem);

    temporizadorMensagem = setTimeout(() => {
        elemento.classList.remove("show");
    }, 5000);
}


// ==========================================
// REQUISIÇÕES À API ANTIGA
// ==========================================

async function requisicao(endpoint, opcoes = {}) {
    const resposta = await fetch(`${API}${endpoint}`, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opcoes.headers || {})
        }
    });

    if (resposta.status === 401) {
        sair();
        throw new Error("Sessão expirada. Entre novamente.");
    }

    if (resposta.status === 403) {
        throw new Error("Seu usuário não tem permissão de administrador.");
    }

    const texto = await resposta.text();

    let resultado = {};

    try {
        resultado = texto ? JSON.parse(texto) : {};
    } catch {
        resultado = { detail: texto };
    }

    if (!resposta.ok) {
        throw new Error(resultado.detail || `Erro HTTP ${resposta.status}`);
    }

    return resultado;
}


// ==========================================
// AUTENTICAÇÃO DA API AUTOMATION
// ==========================================

async function requisicaoAutomation(endpoint, opcoes = {}) {

    if (!credenciaisAutomation) {
        throw new Error("Autenticação administrativa da Automation necessária.");
    }

    const autenticacao = btoa(
        `${credenciaisAutomation.email}:${credenciaisAutomation.senha}`
    );

    const resposta = await fetch(`${API_AUTOMATION}${endpoint}`, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${autenticacao}`,
            ...(opcoes.headers || {})
        }
    });

    const texto = await resposta.text();

    let resultado = {};

    try {
        resultado = texto ? JSON.parse(texto) : {};
    } catch {
        resultado = { detail: texto };
    }

    if (!resposta.ok) {

        if (resposta.status === 401) {
            credenciaisAutomation = null;
            throw new Error("Credenciais da Automation incorretas ou inválidas.");
        }

        if (resposta.status === 403) {
            throw new Error(resultado.detail || "Acesso administrativo negado.");
        }

        throw new Error(
            resultado.detail || `Erro na Automation: HTTP ${resposta.status}`
        );
    }

    return resultado;
}


// ==========================================
// LOGIN ADMINISTRATIVO ANTIGO
// ==========================================

$("formLoginAdmin").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botao = evento.submitter;
    const cpf = $("cpfAdmin").value.replace(/\D/g, "");
    const senha = $("senhaAdmin").value;

    $("erroLogin").textContent = "";

    botao.disabled = true;
    botao.textContent = "Verificando...";

    try {
        const resposta = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ cpf, senha })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.detail || "CPF ou senha inválidos.");
        }

        token = resultado.access_token;

        if (!token) {
            throw new Error("A API não retornou o token.");
        }

        localStorage.setItem("tokenAdminFlow", token);

        await iniciarPainel();

    } catch (erro) {
        $("erroLogin").textContent = erro.message;

    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar no painel";
    }
});


// ==========================================
// SAIR
// ==========================================

function sair() {
    localStorage.removeItem("tokenAdminFlow");

    token = null;
    credenciaisAutomation = null;

    $("painelAdmin").hidden = true;
    $("loginAdmin").hidden = false;

    $("cpfAdmin").value = "";
    $("senhaAdmin").value = "";

    $("nomeAdminTopo").textContent = "Administrador";
    $("adminNome").textContent = "Administrador";
}


// ==========================================
// INICIAR E VALIDAR ACESSO
// ==========================================

async function iniciarPainel() {

    if (!token) {
        $("loginAdmin").hidden = false;
        $("painelAdmin").hidden = true;
        return;
    }

    try {

        const administrador = await requisicao("/funcionario_empregado");

        const nomeAdministrador = administrador.nome || "Administrador";

        $("adminNome").textContent = nomeAdministrador;
        $("nomeAdminTopo").textContent = nomeAdministrador;

        atualizarDataAtual();

        $("loginAdmin").hidden = true;
        $("painelAdmin").hidden = false;

        await carregarDados();

    } catch (erro) {

        if (token) {
            mensagem(erro.message);
        }

        if (
            erro.message.includes("administrador") ||
            erro.message.includes("Sessão expirada")
        ) {
            sair();
        }
    }
}


// ==========================================
// CARREGAR TODOS OS DADOS ANTIGOS
// ==========================================

async function carregarDados() {

    try {

        const resultados = await Promise.all([
            requisicao("/admin/clientes"),
            requisicao("/produtos"),
            requisicao("/admin/compras"),
            requisicao("/admin/assinaturas"),
            requisicao("/admin/pagamentos"),
            requisicao("/avaliacoes")
        ]);

        dados.clientes = resultados[0];
        dados.produtos = resultados[1];
        dados.compras = resultados[2];
        dados.assinaturas = resultados[3];
        dados.pagamentos = resultados[4];
        dados.avaliacoes = resultados[5];

        atualizarPainel();

    } catch (erro) {

        mensagem("Não foi possível carregar todos os dados: " + erro.message);
        throw erro;
    }
}


// ==========================================
// VISÃO GERAL E INDICADORES
// ==========================================

function atualizarPainel() {

    $("totalClientes").textContent = dados.clientes.length;
    $("totalProdutos").textContent = dados.produtos.length;
    $("totalCompras").textContent = dados.compras.length;
    $("totalAssinaturas").textContent = dados.assinaturas.length;
    $("totalAvaliacoes").textContent = dados.avaliacoes.length;

    const aprovados = dados.pagamentos.filter(p =>
        ["aprovado", "pago", "confirmado"].includes(
            String(p.status).toLowerCase()
        )
    );

    const pendentes = dados.pagamentos.filter(p =>
        String(p.status).toLowerCase() === "pendente"
    );

    const recebido = aprovados.reduce(
        (total, p) => total + Number(p.valor || 0), 0
    );

    const valorPendente = pendentes.reduce(
        (total, p) => total + Number(p.valor || 0), 0
    );

    $("totalRecebido").textContent = dinheiro(recebido);
    $("totalPendente").textContent = dinheiro(valorPendente);

    renderizarGrafico();
    renderizarUltimasCompras();
    renderizarClientes();
    renderizarProdutos();
    renderizarCompras();
    renderizarAssinaturas();
    renderizarPagamentos();
    renderizarAvaliacoes();
}


// ==========================================
// GRÁFICO
// ==========================================

function renderizarGrafico() {

    const status = {};

    dados.pagamentos.forEach(pagamento => {
        const nome = pagamento.status || "indefinido";

        status[nome] = (status[nome] || 0) + Number(pagamento.valor || 0);
    });

    const valores = Object.entries(status);
    const maior = Math.max(...valores.map(item => item[1]), 1);

    $("graficoStatus").innerHTML = valores.length
        ? valores.map(([nome, valor]) => `
            <div class="chart-row">
                <div class="chart-label">
                    <span>${escapar(nome)}</span>
                    <strong>${dinheiro(valor)}</strong>
                </div>

                <div class="bar-bg">
                    <div class="bar" style="width:${valor / maior * 100}%"></div>
                </div>
            </div>
        `).join("")
        : '<div class="empty">Nenhum pagamento registrado.</div>';
}


// ==========================================
// ÚLTIMAS COMPRAS
// ==========================================

function renderizarUltimasCompras() {

    const recentes = [...dados.compras]
        .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
        .slice(0, 5);

    $("ultimasCompras").innerHTML = recentes.length
        ? recentes.map(compra => `
            <div class="recent-item">
                <div>
                    <strong>${escapar(compra.cliente)}</strong>
                    <br>
                    <span>${escapar(compra.produto)}</span>
                </div>

                <div>
                    <strong>${dinheiro(compra.valor)}</strong>
                    <br>
                    <span>${escapar(compra.status)}</span>
                </div>
            </div>
        `).join("")
        : '<div class="empty">Nenhuma compra registrada.</div>';
}


// ==========================================
// TABELA DE CLIENTES
// ==========================================

function renderizarClientes(lista = dados.clientes) {

    $("tabelaClientes").innerHTML = lista.length
        ? lista.map(c => `
            <tr>
                <td>${escapar(c.id)}</td>
                <td>${escapar(c.nome)}</td>
                <td>${escapar(c.cpf)}</td>
                <td>${escapar(c.email)}</td>
            </tr>
        `).join("")
        : '<tr><td colspan="4" class="empty">Nenhum cliente encontrado.</td></tr>';
}


// ==========================================
// TABELA DE PRODUTOS
// ==========================================

function renderizarProdutos(lista = dados.produtos) {

    $("tabelaProdutos").innerHTML = lista.length
        ? lista.map(p => `
            <tr>
                <td>${escapar(p.id)}</td>
                <td>${escapar(p.nome)}</td>
                <td>${dinheiro(p.preco)}</td>
                <td>${dinheiro(p.mensalidade)}</td>
                <td>${escapar(p.tipo_venda)}</td>
                <td>
                    <button class="delete-btn" data-excluir-produto="${escapar(p.id)}">
                        Excluir
                    </button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>';
}


// ==========================================
// TABELA DE COMPRAS
// ==========================================

function renderizarCompras(lista = dados.compras) {

    $("tabelaCompras").innerHTML = lista.length
        ? lista.map(c => `
            <tr>
                <td>${escapar(c.id)}</td>
                <td>${escapar(c.cliente)}</td>
                <td>${escapar(c.produto)}</td>
                <td>${dinheiro(c.valor)}</td>
                <td>${escapar(c.tipo)}</td>
                <td>${statusHTML(c.status)}</td>
                <td>${dataFormatada(c.data_compra)}</td>
            </tr>
        `).join("")
        : '<tr><td colspan="7" class="empty">Nenhuma compra encontrada.</td></tr>';
}


// ==========================================
// TABELA DE ASSINATURAS
// ==========================================

function renderizarAssinaturas(lista = dados.assinaturas) {

    $("tabelaAssinaturas").innerHTML = lista.length
        ? lista.map(a => `
            <tr>
                <td>${escapar(a.id)}</td>
                <td>${escapar(a.cliente)}</td>
                <td>${escapar(a.produto)}</td>
                <td>${dinheiro(a.valor_mensal)}</td>
                <td>${statusHTML(a.status)}</td>
                <td>${dataFormatada(a.inicio)}</td>
                <td>${dataFormatada(a.proxima_cobranca)}</td>
            </tr>
        `).join("")
        : '<tr><td colspan="7" class="empty">Nenhuma assinatura encontrada.</td></tr>';
}


// ==========================================
// TABELA DE PAGAMENTOS
// ==========================================

function renderizarPagamentos(lista = dados.pagamentos) {

    $("tabelaPagamentos").innerHTML = lista.length
        ? lista.map(p => `
            <tr>
                <td>${escapar(p.id)}</td>
                <td>${escapar(p.cliente)}</td>
                <td>${dinheiro(p.valor)}</td>
                <td>${escapar(p.metodo)}</td>
                <td>${escapar(p.tipo)}</td>
                <td>${statusHTML(p.status)}</td>
                <td>${dataFormatada(p.data_pagamento)}</td>
            </tr>
        `).join("")
        : '<tr><td colspan="7" class="empty">Nenhum pagamento encontrado.</td></tr>';
}


// ==========================================
// AVALIAÇÕES
// ==========================================

function renderizarAvaliacoes(lista = dados.avaliacoes) {

    $("listaAvaliacoes").innerHTML = lista.length
        ? lista.map(a => {

            const nota = Math.max(0, Math.min(5, Number(a.nota) || 0));

            return `
                <article class="review-card">
                    <h4>${escapar(a.nome)}</h4>

                    <div class="review-stars">
                        ${"★".repeat(nota)}${"☆".repeat(5 - nota)}
                    </div>

                    <p>${escapar(a.comentario)}</p>

                    <button class="delete-btn" data-excluir-avaliacao="${escapar(a.id)}">
                        Excluir avaliação
                    </button>
                </article>
            `;
        }).join("")
        : '<div class="empty">Nenhuma avaliação encontrada.</div>';
}


// ==========================================
// GESTÃO DE LICENÇAS - INTERFACE
// ==========================================

const estiloLicencas = document.createElement("style");

estiloLicencas.textContent = `
    .licencas-container {
        display: grid;
        gap: 20px;
    }

    .licencas-resumo {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 14px;
    }

    .licenca-card {
        background: var(--card-bg, #fff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 14px;
        padding: 18px;
    }

    .licenca-card strong {
        display: block;
        font-size: 25px;
        margin-top: 8px;
    }

    .licencas-acoes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .licencas-acoes button,
    .licenca-form button,
    .licenca-login button {
        border: 0;
        border-radius: 8px;
        padding: 9px 13px;
        cursor: pointer;
        font-weight: 600;
    }

    .licenca-suspender {
        background: #fee2e2;
        color: #991b1b;
    }

    .licenca-reativar {
        background: #dcfce7;
        color: #166534;
    }

    .licenca-historico {
        background: #e0e7ff;
        color: #3730a3;
    }

    .licenca-form,
    .licenca-login {
        display: grid;
        gap: 12px;
        max-width: 520px;
        padding: 20px;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 12px;
        background: var(--card-bg, #fff);
    }

    .licenca-form input,
    .licenca-form select,
    .licenca-form textarea,
    .licenca-login input {
        width: 100%;
        box-sizing: border-box;
        padding: 11px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font: inherit;
    }

    .licenca-form textarea {
        min-height: 90px;
        resize: vertical;
    }

    .licenca-login button,
    .licenca-form button {
        background: #1e293b;
        color: white;
    }

    .licenca-aviso {
        padding: 12px;
        border-radius: 8px;
        background: #fff7ed;
        color: #9a3412;
    }

    .licenca-historico-item {
        padding: 12px;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    .licencas-tabela {
        overflow-x: auto;
    }

    .licencas-tabela table {
        width: 100%;
        border-collapse: collapse;
        min-width: 850px;
    }

    .licencas-tabela th,
    .licencas-tabela td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
    }
`;

document.head.appendChild(estiloLicencas);


// ==========================================
// CRIAR A PÁGINA AUTOMATICAMENTE
// ==========================================

function criarPaginaLicencas() {

    const paginaExistente = $("page-dashboard");

    if (!paginaExistente) {
        console.error("Não foi encontrada a página page-dashboard.");
        return;
    }

    const pagina = document.createElement("section");

    pagina.id = "page-licencas";
    pagina.className = "page";

    pagina.innerHTML = `
        <div class="licencas-container">

            <div>
                <h2>Gestão de Licenças</h2>
                <p>Controle das licenças da Flow Core Automation.</p>
            </div>

            <div id="licencaAutenticacao"></div>

            <div id="licencaConteudo" hidden>

                <div class="licencas-resumo">
                    <div class="licenca-card">
                        <span>Total de licenças</span>
                        <strong id="licTotal">0</strong>
                    </div>

                    <div class="licenca-card">
                        <span>Ativas</span>
                        <strong id="licAtivas">0</strong>
                    </div>

                    <div class="licenca-card">
                        <span>Suspensas</span>
                        <strong id="licSuspensas">0</strong>
                    </div>

                    <div class="licenca-card">
                        <span>Bloqueios definitivos</span>
                        <strong id="licBloqueadas">0</strong>
                    </div>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <input
                        id="buscaLicencas"
                        type="search"
                        placeholder="Buscar empresa ou e-mail..."
                    >

                    <button type="button" id="atualizarLicencas">
                        Atualizar licenças
                    </button>

                    <button type="button" id="trocarAdminAutomation">
                        Trocar credenciais
                    </button>
                </div>

                <div class="licencas-tabela">
                    <table>
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>E-mail</th>
                                <th>Plano</th>
                                <th>Status</th>
                                <th>Vencimento</th>
                                <th>Suspensões</th>
                                <th>Ações</th>
                            </tr>
                        </thead>

                        <tbody id="tabelaLicencas">
                            <tr>
                                <td colspan="7">Carregando...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="licencaFormulario"></div>

                <div id="licencaHistorico"></div>

            </div>
        </div>
    `;

    paginaExistente.parentElement.appendChild(pagina);

    const navExistente = document.querySelector(".nav-item");

    if (navExistente) {

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "nav-item";
        botao.dataset.page = "licencas";
        botao.textContent = "Gestão de Licenças";

        navExistente.parentElement.appendChild(botao);
    }

    $("buscaLicencas").addEventListener("input", renderizarLicencas);

    $("atualizarLicencas").addEventListener(
        "click",
        carregarLicencas
    );

    $("trocarAdminAutomation").addEventListener("click", () => {
        credenciaisAutomation = null;
        mostrarLoginAutomation();
    });
}


// ==========================================
// LOGIN DA GESTÃO DE LICENÇAS
// ==========================================

function mostrarLoginAutomation() {

    $("licencaConteudo").hidden = true;

    $("licencaAutenticacao").innerHTML = `
        <form class="licenca-login" id="formLoginAutomation">

            <h3>Acesso administrativo da Automation</h3>

            <p>Informe as credenciais administrativas configuradas na Automation.</p>

            <label for="automationEmail">E-mail administrativo</label>

            <input
                id="automationEmail"
                type="email"
                required
                autocomplete="username"
            >

            <label for="automationSenha">Senha administrativa</label>

            <input
                id="automationSenha"
                type="password"
                required
                autocomplete="current-password"
            >

            <button type="submit" id="btnLoginAutomation">
                Acessar licenças
            </button>

            <p id="erroLoginAutomation"></p>

        </form>
    `;

    $("formLoginAutomation").addEventListener("submit", async evento => {

        evento.preventDefault();

        const botao = $("btnLoginAutomation");

        botao.disabled = true;
        botao.textContent = "Verificando...";

        const email = $("automationEmail").value.trim();
        const senha = $("automationSenha").value;

        credenciaisAutomation = { email, senha };

        try {

            await carregarLicencas();

            $("licencaAutenticacao").innerHTML = "";
            $("licencaConteudo").hidden = false;

            mensagem("Acesso à Gestão de Licenças autorizado.");

        } catch (erro) {

            credenciaisAutomation = null;

            $("erroLoginAutomation").textContent = erro.message;

        } finally {

            botao.disabled = false;
            botao.textContent = "Acessar licenças";
        }
    });
}


// ==========================================
// CARREGAR LICENÇAS
// ==========================================

async function carregarLicencas() {

    const resultado = await requisicaoAutomation("/admin/licencas");

    dados.licencas = resultado.licencas || [];

    renderizarLicencas();

    return resultado;
}


// ==========================================
// RENDERIZAR LICENÇAS
// ==========================================

function renderizarLicencas() {

    if (!$("tabelaLicencas")) return;

    const termo = ($("buscaLicencas")?.value || "").toLowerCase().trim();

    const lista = dados.licencas.filter(licenca =>
        String(licenca.empresa || "").toLowerCase().includes(termo) ||
        String(licenca.email || "").toLowerCase().includes(termo)
    );

    $("licTotal").textContent = dados.licencas.length;

    $("licAtivas").textContent = dados.licencas.filter(
        l => l.status === "ativa"
    ).length;

    $("licSuspensas").textContent = dados.licencas.filter(
        l => l.status === "suspensa"
    ).length;

    $("licBloqueadas").textContent = dados.licencas.filter(
        l => l.bloqueio_definitivo
    ).length;

    $("tabelaLicencas").innerHTML = lista.length
        ? lista.map(licenca => {

            let acoes = `
                <button
                    class="licenca-historico"
                    data-licenca-historico="${licenca.licenca_id}">
                    Histórico
                </button>
            `;

            if (
                licenca.status !== "suspensa" &&
                !licenca.bloqueio_definitivo
            ) {
                acoes += `
                    <button
                        class="licenca-suspender"
                        data-licenca-suspender="${licenca.licenca_id}">
                        Suspender
                    </button>
                `;
            }

            if (
                licenca.status === "suspensa" &&
                !licenca.bloqueio_definitivo
            ) {
                acoes += `
                    <button
                        class="licenca-reativar"
                        data-licenca-reativar="${licenca.licenca_id}">
                        Reativar
                    </button>
                `;
            }

            return `
                <tr>
                    <td>
                        <strong>${escapar(licenca.empresa)}</strong>
                        <br>
                        <small>${escapar(licenca.documento)}</small>
                    </td>

                    <td>${escapar(licenca.email)}</td>

                    <td>${escapar(licenca.plano)}</td>

                    <td>
                        ${statusHTML(
                            licenca.bloqueio_definitivo
                                ? "bloqueio definitivo"
                                : licenca.status
                        )}
                    </td>

                    <td>${dataFormatada(licenca.vencimento)}</td>

                    <td>
                        ${licenca.suspensoes_inadimplencia}/2
                    </td>

                    <td>
                        <div class="licencas-acoes">
                            ${acoes}
                        </div>
                    </td>
                </tr>
            `;

        }).join("")
        : `
            <tr>
                <td colspan="7">Nenhuma licença encontrada.</td>
            </tr>
        `;
}


// ==========================================
// FORMULÁRIO DE SUSPENSÃO
// ==========================================

function mostrarFormularioSuspensao(licencaId) {

    const licenca = dados.licencas.find(
        l => l.licenca_id === Number(licencaId)
    );

    if (!licenca) return;

    $("licencaFormulario").innerHTML = `
        <form class="licenca-form" id="formSuspenderLicenca">

            <h3>Suspender licença</h3>

            <p>
                Empresa: <strong>${escapar(licenca.empresa)}</strong>
            </p>

            <label for="categoriaSuspensao">Categoria</label>

            <select id="categoriaSuspensao" required>
                <option value="inadimplencia">Inadimplência</option>
                <option value="outro">Outro motivo</option>
            </select>

            <label for="motivoSuspensao">Motivo da suspensão</label>

            <textarea
                id="motivoSuspensao"
                minlength="3"
                maxlength="1000"
                required
                placeholder="Descreva o motivo..."
            ></textarea>

            <div class="licenca-aviso">
                A segunda suspensão por inadimplência gera bloqueio definitivo.
            </div>

            <button type="submit" id="confirmarSuspensao">
                Confirmar suspensão
            </button>

            <button type="button" id="cancelarSuspensao">
                Cancelar
            </button>

        </form>
    `;

    $("cancelarSuspensao").addEventListener("click", () => {
        $("licencaFormulario").innerHTML = "";
    });

    $("formSuspenderLicenca").addEventListener("submit", async evento => {

        evento.preventDefault();

        const categoria = $("categoriaSuspensao").value;
        const motivo = $("motivoSuspensao").value.trim();

        if (
            categoria === "inadimplencia" &&
            licenca.suspensoes_inadimplencia >= 1
        ) {
            if (!confirm(
                "Esta será a segunda suspensão por inadimplência. " +
                "O bloqueio da empresa será definitivo. Continuar?"
            )) {
                return;
            }
        }

        const botao = $("confirmarSuspensao");

        botao.disabled = true;
        botao.textContent = "Processando...";

        try {

            const resultado = await requisicaoAutomation(
                `/admin/licencas/${licencaId}/suspender`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        categoria,
                        motivo
                    })
                }
            );

            $("licencaFormulario").innerHTML = "";

            mensagem(resultado.mensagem);

            await carregarLicencas();

        } catch (erro) {

            mensagem(erro.message);

            botao.disabled = false;
            botao.textContent = "Confirmar suspensão";
        }
    });
}


// ==========================================
// REATIVAR LICENÇA
// ==========================================

async function reativarLicenca(licencaId) {

    const licenca = dados.licencas.find(
        l => l.licenca_id === Number(licencaId)
    );

    if (!licenca) return;

    if (!confirm(
        `Deseja reativar a licença de ${licenca.empresa}?`
    )) {
        return;
    }

    try {

        const resultado = await requisicaoAutomation(
            `/admin/licencas/${licencaId}/reativar`,
            {
                method: "POST"
            }
        );

        mensagem(resultado.mensagem);

        await carregarLicencas();

    } catch (erro) {

        mensagem(erro.message);
    }
}


// ==========================================
// HISTÓRICO DA LICENÇA
// ==========================================

async function mostrarHistoricoLicenca(licencaId) {

    $("licencaHistorico").innerHTML = "<p>Carregando histórico...</p>";

    try {

        const resultado = await requisicaoAutomation(
            `/admin/licencas/${licencaId}/historico`
        );

        const historico = resultado.historico || [];

        $("licencaHistorico").innerHTML = `
            <div class="licenca-card">

                <h3>Histórico da licença #${licencaId}</h3>

                ${
                    historico.length
                        ? historico.map(item => `
                            <div class="licenca-historico-item">
                                <strong>${escapar(item.acao)}</strong>

                                <p>${escapar(item.detalhes)}</p>

                                <small>${dataHoraFormatada(item.data)}</small>
                            </div>
                        `).join("")
                        : "<p>Nenhuma movimentação registrada.</p>"
                }

            </div>
        `;

    } catch (erro) {

        $("licencaHistorico").innerHTML = `
            <p>${escapar(erro.message)}</p>
        `;
    }
}


// ==========================================
// CLIQUES DA GESTÃO DE LICENÇAS
// ==========================================

document.addEventListener("click", async evento => {

    const alvo = evento.target.closest("button");

    if (!alvo) return;

    if (alvo.dataset.licencaSuspender) {
        mostrarFormularioSuspensao(
            alvo.dataset.licencaSuspender
        );
    }

    if (alvo.dataset.licencaReativar) {
        await reativarLicenca(
            alvo.dataset.licencaReativar
        );
    }

    if (alvo.dataset.licencaHistorico) {
        await mostrarHistoricoLicenca(
            alvo.dataset.licencaHistorico
        );
    }
});


// ==========================================
// NAVEGAÇÃO
// ==========================================

const titulos = {
    dashboard: "Visão geral",
    clientes: "Clientes",
    produtos: "Produtos",
    compras: "Compras",
    assinaturas: "Assinaturas",
    pagamentos: "Pagamentos",
    avaliacoes: "Avaliações",
    licencas: "Gestão de Licenças"
};

// Cria a nova página e o botão de navegação antes
// de registrar os eventos dos botões.
criarPaginaLicencas();

document.querySelectorAll(".nav-item").forEach(botao => {

    botao.addEventListener("click", async () => {

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        document.querySelectorAll(".page").forEach(pagina => {
            pagina.classList.remove("active");
        });

        botao.classList.add("active");

        const pagina = botao.dataset.page;

        const elementoPagina = $("page-" + pagina);

        if (!elementoPagina) return;

        elementoPagina.classList.add("active");

        $("tituloPagina").textContent = titulos[pagina] || pagina;

        if (pagina === "licencas") {

            if (!credenciaisAutomation) {
                mostrarLoginAutomation();
            } else {
                try {
                    await carregarLicencas();
                    $("licencaConteudo").hidden = false;
                } catch (erro) {
                    mensagem(erro.message);

                    if (!credenciaisAutomation) {
                        mostrarLoginAutomation();
                    }
                }
            }
        }
    });
});


// ==========================================
// BUSCAS
// ==========================================

function configurarBusca(inputId, nomeLista, campo, renderizar) {

    $(inputId).addEventListener("input", evento => {

        const termo = evento.target.value.toLowerCase().trim();

        const listaAtual = dados[nomeLista];

        const filtrados = listaAtual.filter(item =>
            String(item[campo] ?? "").toLowerCase().includes(termo)
        );

        renderizar(filtrados);
    });
}

configurarBusca("buscaClientes", "clientes", "nome", renderizarClientes);
configurarBusca("buscaProdutos", "produtos", "nome", renderizarProdutos);
configurarBusca("buscaCompras", "compras", "cliente", renderizarCompras);
configurarBusca("buscaAssinaturas", "assinaturas", "cliente", renderizarAssinaturas);
configurarBusca("buscaPagamentos", "pagamentos", "cliente", renderizarPagamentos);
configurarBusca("buscaAvaliacoes", "avaliacoes", "nome", renderizarAvaliacoes);


// ==========================================
// CADASTRAR PRODUTOS
// ==========================================

$("formCadastroProduto").addEventListener("submit", async evento => {

    evento.preventDefault();

    const botao = $("btnCadastrarProduto");
    const erro = $("erroCadastroProduto");

    erro.textContent = "";

    const tipoVenda = $("produtoTipoVenda").value;
    const preco = Number($("produtoPreco").value || 0);
    const mensalidade = Number($("produtoMensalidade").value || 0);

    if (tipoVenda === "avulso" && preco <= 0) {
        erro.textContent = "Informe um preço avulso válido.";
        return;
    }

    if (tipoVenda === "mensal" && mensalidade <= 0) {
        erro.textContent = "Informe uma mensalidade válida.";
        return;
    }

    if (
        tipoVenda === "ambos" &&
        preco <= 0 &&
        mensalidade <= 0
    ) {
        erro.textContent = "Informe pelo menos um preço.";
        return;
    }

    const produto = {
        nome: $("produtoNome").value.trim(),
        preco,
        descrisao: $("produtoDescricao").value.trim(),
        validade: $("produtoValidade").value.trim(),
        incluso: $("produtoIncluso").value.trim(),
        mensalidade,
        video: $("produtoVideo").value.trim(),
        tipo_venda: tipoVenda
    };

    botao.disabled = true;
    botao.textContent = "Cadastrando...";

    try {

        await requisicao("/postar_produto", {
            method: "POST",
            body: JSON.stringify(produto)
        });

        mensagem("Produto cadastrado com sucesso!");

        $("formCadastroProduto").reset();

        await carregarDados();

    } catch (erroRequisicao) {

        erro.textContent = erroRequisicao.message;

    } finally {

        botao.disabled = false;
        botao.textContent = "+ Cadastrar produto";
    }
});


// ==========================================
// EXCLUSÕES
// ==========================================

document.addEventListener("click", async evento => {

    const alvo = evento.target.closest("button");

    if (!alvo) return;

    const produtoId = alvo.dataset.excluirProduto;
    const avaliacaoId = alvo.dataset.excluirAvaliacao;

    if (produtoId) {

        if (!confirm("Deseja realmente excluir este produto?")) return;

        try {

            await requisicao(`/produtos/${produtoId}`, {
                method: "DELETE"
            });

            mensagem("Produto excluído com sucesso.");

            await carregarDados();

        } catch (erro) {

            mensagem(erro.message);
        }
    }

    if (avaliacaoId) {

        if (!confirm("Deseja realmente excluir esta avaliação?")) return;

        try {

            await requisicao(`/avaliacoes/${avaliacaoId}`, {
                method: "DELETE"
            });

            mensagem("Avaliação excluída com sucesso.");

            await carregarDados();

        } catch (erro) {

            mensagem(erro.message);
        }
    }
});


// ==========================================
// ATUALIZAR DADOS
// ==========================================

$("atualizarDados").addEventListener("click", async () => {

    const botao = $("atualizarDados");

    botao.disabled = true;
    botao.textContent = "Atualizando...";

    try {

        await carregarDados();

        mensagem("Dados atualizados com sucesso.");

    } catch (erro) {

        mensagem(erro.message);

    } finally {

        botao.disabled = false;
        botao.textContent = "↻ Atualizar dados";
    }
});


// ==========================================
// SAIR DA CONTA
// ==========================================

$("sairAdmin").addEventListener("click", sair);


// ==========================================
// INICIALIZAÇÃO
// ==========================================

iniciarPainel();


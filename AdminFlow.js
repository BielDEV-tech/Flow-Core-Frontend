
const API = "https://flow-core-api.onrender.com";

let token = localStorage.getItem("tokenAdminFlow");
let dados = {
    clientes: [],
    produtos: [],
    compras: [],
    assinaturas: [],
    pagamentos: [],
    avaliacoes: []
};

const $ = (id) => document.getElementById(id);

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

function statusHTML(status) {
    const texto = String(status || "indefinido").toLowerCase();
    const classe = texto.replace(/[^a-z0-9_-]/g, "");

    return `<span class="status ${classe}">${escapar(status || "Indefinido")}</span>`;
}

function mensagem(texto) {
    const elemento = $("mensagem");

    elemento.textContent = texto;
    elemento.classList.add("show");

    setTimeout(() => elemento.classList.remove("show"), 5000);
}

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

// LOGIN ADMINISTRATIVO

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
            headers: { "Content-Type": "application/json" },
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

function sair() {
    localStorage.removeItem("tokenAdminFlow");
    token = null;

    $("painelAdmin").hidden = true;
    $("loginAdmin").hidden = false;
}

// INICIAR E VALIDAR ACESSO

async function iniciarPainel() {
    if (!token) {
        $("loginAdmin").hidden = false;
        $("painelAdmin").hidden = true;
        return;
    }

    try {
        // Essa rota valida se o token pertence a um administrador.
        const administrador = await requisicao("/funcionario_empregado");

        $("adminNome").textContent = administrador.nome || "Administrador";

        $("loginAdmin").hidden = true;
        $("painelAdmin").hidden = false;

        await carregarDados();

    } catch (erro) {
        if (token) {
            mensagem(erro.message);
        }

        if (erro.message.includes("administrador")) {
            sair();
        }
    }
}

// CARREGAR TODOS OS DADOS

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

// VISÃO GERAL E INDICADORES

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

function renderizarUltimasCompras() {
    const recentes = [...dados.compras]
        .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
        .slice(0, 5);

    $("ultimasCompras").innerHTML = recentes.length
        ? recentes.map(compra => `
            <div class="recent-item">
                <div>
                    <strong>${escapar(compra.cliente)}</strong>
                    <br><span>${escapar(compra.produto)}</span>
                </div>
                <div>
                    <strong>${dinheiro(compra.valor)}</strong>
                    <br><span>${escapar(compra.status)}</span>
                </div>
            </div>
        `).join("")
        : '<div class="empty">Nenhuma compra registrada.</div>';
}

// TABELAS

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

function renderizarAvaliacoes(lista = dados.avaliacoes) {
    $("listaAvaliacoes").innerHTML = lista.length
        ? lista.map(a => `
            <article class="review-card">
                <h4>${escapar(a.nome)}</h4>
                <div class="review-stars">${"★".repeat(Math.max(0, Math.min(5, Number(a.nota) || 0)))}${"☆".repeat(5 - Math.max(0, Math.min(5, Number(a.nota) || 0)))}</div>
                <p>${escapar(a.comentario)}</p>
                <button class="delete-btn" data-excluir-avaliacao="${escapar(a.id)}">
                    Excluir avaliação
                </button>
            </article>
        `).join("")
        : '<div class="empty">Nenhuma avaliação encontrada.</div>';
}

// NAVEGAÇÃO

const titulos = {
    dashboard: "Visão geral",
    clientes: "Clientes",
    produtos: "Produtos",
    compras: "Compras",
    assinaturas: "Assinaturas",
    pagamentos: "Pagamentos",
    avaliacoes: "Avaliações"
};

document.querySelectorAll(".nav-item").forEach(botao => {
    botao.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(item =>
            item.classList.remove("active")
        );

        document.querySelectorAll(".page").forEach(pagina =>
            pagina.classList.remove("active")
        );

        botao.classList.add("active");

        const pagina = botao.dataset.page;

        $("page-" + pagina).classList.add("active");
        $("tituloPagina").textContent = titulos[pagina];
    });
});

// BUSCAS

function configurarBusca(inputId, dadosLista, campo, renderizar) {
    $(inputId).addEventListener("input", evento => {
        const termo = evento.target.value.toLowerCase();

        const filtrados = dadosLista.filter(item =>
            String(item[campo] ?? "").toLowerCase().includes(termo)
        );

        renderizar(filtrados);
    });
}

configurarBusca("buscaClientes", dados.clientes, "nome", renderizarClientes);
configurarBusca("buscaProdutos", dados.produtos, "nome", renderizarProdutos);
configurarBusca("buscaCompras", dados.compras, "cliente", renderizarCompras);
configurarBusca("buscaAssinaturas", dados.assinaturas, "cliente", renderizarAssinaturas);
configurarBusca("buscaPagamentos", dados.pagamentos, "cliente", renderizarPagamentos);
configurarBusca("buscaAvaliacoes", dados.avaliacoes, "nome", renderizarAvaliacoes);

// EXCLUSÕES

document.addEventListener("click", async evento => {
    const produtoId = evento.target.dataset.excluirProduto;
    const avaliacaoId = evento.target.dataset.excluirAvaliacao;

    if (produtoId) {
        if (!confirm("Deseja realmente excluir este produto?")) return;

        try {
            await requisicao(`/produtos/${produtoId}`, { method: "DELETE" });
            mensagem("Produto excluído com sucesso.");
            await carregarDados();
        } catch (erro) {
            mensagem(erro.message);
        }
    }

    if (avaliacaoId) {
        if (!confirm("Deseja realmente excluir esta avaliação?")) return;

        try {
            await requisicao(`/avaliacoes/${avaliacaoId}`, { method: "DELETE" });
            mensagem("Avaliação excluída com sucesso.");
            await carregarDados();
        } catch (erro) {
            mensagem(erro.message);
        }
    }
});

// ATUALIZAR E SAIR

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

$("sairAdmin").addEventListener("click", sair);

// INICIALIZAÇÃO

iniciarPainel();

const API_URL = "https://flow-core-s5ik.onrender.com;"


// ======================================
// LOGIN ADMINISTRADOR
// ======================================

async function verificar() {

    const senha = document.getElementById("senha").value
    const cpf = document.getElementById("CPF").value.trim()

    try {

        const resposta = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    senha: senha,
                    cpf: cpf
                })
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {

            alert(dados.detail)
            return
        }

        localStorage.setItem(
            "token",
            dados.access_token
        )

        document.querySelector(
            ".lancar-produto"
        ).style.display = "block"

        document.querySelector(
            ".name"
        ).style.display = "none"

        document.querySelector(
            ".Pass"
        ).style.display = "none"

        document.querySelector(
            ".botao"
        ).style.display = "none"

    } catch (erro) {

        console.error(erro)

        alert(
            "Erro ao conectar com o servidor."
        )
    }
}


// ======================================
// COLOCAR PRODUTO
// ======================================

async function colocarProduto() {

    const token =
        localStorage.getItem("token")

    if (!token) {

        alert(
            "Faça login primeiro."
        )

        return
    }

    const id =
        document.querySelector(".id").value

    const nome =
        document.querySelector(
            ".nomeProduto"
        ).value

    const preco =
        document.querySelector(
            ".preco"
        ).value

    const descrisao =
        document.querySelector(
            ".descricao"
        ).value

    const validade =
        document.querySelector(
            ".validade"
        ).value

    const incluso =
        document.querySelector(
            ".incluso"
        ).value

    const mensalidade =
        document.querySelector(
            ".mensalidade"
        ).value

    const video =
        document.querySelector(
            ".video"
        ).value


    const dados = {

        id: Number(id),

        nome: nome,

        preco: preco,

        descrisao: descrisao,

        validade: validade,

        incluso: incluso,

        mensalidade: mensalidade,

        video: video || null
    }


    console.log(
        "Enviando produto:",
        dados
    )


    try {

        const resposta = await fetch(
            `${API_URL}/postar_produto`,
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`
                },

                body:
                    JSON.stringify(dados)
            }
        )


        const resultado =
            await resposta.json()


        if (!resposta.ok) {

            console.log(
                "Erro:",
                resultado
            )

            alert(
                resultado.detail ||
                "Erro ao lançar produto."
            )

            return
        }


        console.log(
            "Produto lançado:",
            resultado
        )


        alert(
            "Produto lançado com sucesso!"
        )


        document.querySelector(
            ".id"
        ).value = ""

        document.querySelector(
            ".nomeProduto"
        ).value = ""

        document.querySelector(
            ".preco"
        ).value = ""

        document.querySelector(
            ".descricao"
        ).value = ""

        document.querySelector(
            ".validade"
        ).value = ""

        document.querySelector(
            ".incluso"
        ).value = ""

        document.querySelector(
            ".mensalidade"
        ).value = ""

        document.querySelector(
            ".video"
        ).value = ""


    } catch (erro) {

        console.error(erro)

        alert(
            "Erro ao conectar com o servidor."
        )
    }
}


// ======================================
// CARREGAR PRODUTOS
// ======================================

async function carregarProdutos() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/produtos`
            )


        const produtos =
            await resposta.json()


        if (!resposta.ok) {

            console.log(
                "Erro ao buscar produtos:",
                produtos
            )

            return
        }


        const container =
            document.querySelector(
                ".cards"
            )


        if (!container) {

            return
        }


        container.innerHTML = ""


        produtos.forEach(
            (produto) => {

                const card =
                    document.createElement(
                        "div"
                    )


                card.classList.add(
                    "card"
                )


                card.innerHTML = `

                    <h2>
                        ${produto.nome}
                    </h2>

                    <p>
                        ID: ${produto.id}
                    </p>

                    <p>
                        Preço: R$ ${produto.preco}
                    </p>

                    <p>
                        Descrição:
                        ${produto.descrisao}
                    </p>

                    <p>
                        Validade:
                        ${produto.validade}
                    </p>

                    <p>
                        Incluso:
                        ${produto.incluso}
                    </p>

                    <p>
                        Mensalidade:
                        R$ ${produto.mensalidade}
                    </p>

                    ${
                        produto.video
                        ?
                        `
                            <video
                                class="video-produto"
                                controls
                            >

                                <source
                                    src="${produto.video}"
                                    type="video/mp4"
                                >

                            </video>
                        `
                        :
                        ""
                    }

                `


                container.appendChild(
                    card
                )
            }
        )


    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        )
    }
}


// ======================================
// IR PARA AVALIAÇÃO
// ======================================

function irParaAvaliacao() {

    const token =
        localStorage.getItem(
            "token"
        )


    if (!token) {

        localStorage.setItem(
            "avaliar",
            "true"
        )


        window.location.href =
            "login.html"


        return
    }


    abrirFormularioAvaliacao()
}


// ======================================
// ABRIR FORMULÁRIO DE AVALIAÇÃO
// ======================================

function abrirFormularioAvaliacao() {

    const area =
        document.querySelector(
            ".nova-avaliacao"
        )


    if (!area) {

        return
    }


    area.innerHTML = `

        <h2>
            Deixe sua avaliação
        </h2>


        <input
            type="number"
            id="nota"
            min="1"
            max="5"
            placeholder="Nota de 1 a 5"
        >


        <textarea
            id="comentario"
            placeholder="Conte sua experiência..."
        ></textarea>


        <button
            onclick="enviarAvaliacao()"
        >
            Enviar avaliação
        </button>

    `
}


// ======================================
// ENVIAR AVALIAÇÃO
// ======================================

async function enviarAvaliacao() {

    const token =
        localStorage.getItem(
            "token"
        )


    if (!token) {

        alert(
            "Faça login primeiro."
        )

        return
    }


    const nota =
        Number(
            document.querySelector(
                "#nota"
            ).value
        )


    const comentario =
        document.querySelector(
            "#comentario"
        ).value


    if (
        !nota ||
        nota < 1 ||
        nota > 5
    ) {

        alert(
            "Digite uma nota de 1 a 5."
        )

        return
    }


    if (!comentario.trim()) {

        alert(
            "Digite um comentário."
        )

        return
    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/avaliacoes`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({

                            nota: nota,

                            comentario:
                                comentario
                        })
                }
            )


        const dados =
            await resposta.json()


        if (!resposta.ok) {

            alert(
                dados.detail ||
                "Erro ao enviar avaliação."
            )

            return
        }


        alert(
            "Avaliação enviada com sucesso!"
        )


        localStorage.removeItem(
            "avaliar"
        )


        await carregarAvaliacoes()


        abrirAvaliacoes()


    } catch (erro) {

        console.error(erro)

        alert(
            "Não foi possível conectar com a API."
        )
    }
}


// ======================================
// CARREGAR AVALIAÇÕES
// ======================================

async function carregarAvaliacoes() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/avaliacoes`
            )


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar avaliações"
            )
        }


        const avaliacoes =
            await resposta.json()


        const lista =
            document.querySelector(
                "#listaAvaliacoes"
            )


        if (!lista) {

            return
        }


        lista.innerHTML = ""


        if (
            avaliacoes.length === 0
        ) {

            lista.innerHTML = `

                <p>

                    Ainda não temos avaliações.

                    Seja o primeiro a avaliar!

                </p>

            `

            return
        }


        avaliacoes.forEach(
            (avaliacao) => {

                const card =
                    document.createElement(
                        "div"
                    )


                card.classList.add(
                    "card-avaliacao"
                )


                card.innerHTML = `

                    <h3>

                        ${avaliacao.nome}

                    </h3>


                    <p class="nota">

                        ${
                            "⭐".repeat(
                                avaliacao.nota
                            )
                        }

                    </p>


                    <p>

                        ${avaliacao.comentario}

                    </p>

                `


                lista.appendChild(
                    card
                )
            }
        )


    } catch (erro) {

        console.error(
            "Erro ao carregar avaliações:",
            erro
        )
    }
}


// ======================================
// ABRIR ÁREA DE AVALIAÇÕES
// ======================================

function abrirAvaliacoes() {

    const area =
        document.querySelector(
            ".nova-avaliacao"
        )


    if (!area) {

        return
    }


    area.innerHTML = `

        <h2>
            Quer deixar sua avaliação?
        </h2>


        <p>

            Conte para outras pessoas como foi
            sua experiência.

        </p>


        <button
            onclick="irParaAvaliacao()"
        >

            Avaliar a Flow Core

        </button>

    `
}


// ======================================
// QUANDO O SITE CARREGAR
// ======================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        carregarProdutos()

        carregarAvaliacoes()


        const token =
            localStorage.getItem(
                "token"
            )


        const querAvaliar =
            localStorage.getItem(
                "avaliar"
            )


        if (
            token &&
            querAvaliar === "true"
        ) {

            localStorage.removeItem(
                "avaliar"
            )


            abrirFormularioAvaliacao()
        }
    }
)


// ======================================
// MODO DARK
// ======================================

const botaoDark =
    document.querySelector(
        "#modoDark"
    )


if (botaoDark) {

    botaoDark.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            )


            if (
                document.body.classList.contains(
                    "dark"
                )
            ) {

                botaoDark.textContent =
                    "☀️"


                localStorage.setItem(
                    "modoDark",
                    "ativado"
                )

            } else {

                botaoDark.textContent =
                    "🌙"


                localStorage.setItem(
                    "modoDark",
                    "desativado"
                )
            }
        }
    )
}


// ======================================
// RECUPERAR MODO DARK
// ======================================

const modoSalvo =
    localStorage.getItem(
        "modoDark"
    )


if (
    modoSalvo === "ativado"
) {

    document.body.classList.add(
        "dark"
    )


    if (botaoDark) {

        botaoDark.textContent =
            "☀️"
    }
}
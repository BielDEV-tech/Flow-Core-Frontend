let temporizadorErro;

function mostrarErro(texto) {
    const card = document.querySelector("#cardErro");
    const textoErro = document.querySelector("#textoErro");

    clearTimeout(temporizadorErro);

    textoErro.textContent = texto;
    card.classList.add("visivel");

    temporizadorErro = setTimeout(() => {
        fecharErro();
    }, 5000);
}

function fecharErro() {
    const card = document.querySelector("#cardErro");

    if (!card) return;

    card.classList.remove("visivel");
    clearTimeout(temporizadorErro);
}


async function login() {
    const cpfInput = document.querySelector("#cpf");
    const senhaInput = document.querySelector("#senha");
    const botao = document.querySelector(".card-login button");
    const cpf = cpfInput.value.trim();
    const senha = senhaInput.value;

    if (!cpf || !senha) {
        mostrarErro("Preencha o CPF e a senha para continuar.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const resposta = await fetch(
            "https://flow-core-api.onrender.com/login_usuario",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome: "",
                    senha: senha,
                    cpf: cpf,
                    email: ""
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error("Erro retornado pela API:", dados);

            mostrarErro(
                resposta.status === 401
                    ? "CPF ou senha inválidos."
                    : dados.detail || "Erro ao realizar login."
            );
            return;
        }

        const token = dados.access_token;

        if (!token) {
            mostrarErro("A API não retornou o token de acesso.");
            return;
        }

        localStorage.setItem("token", token);

        window.location.href = "./index.html";

    } catch (erro) {
        console.error("Erro no login:", erro);
        mostrarErro("Falha de comunicação com o servidor.");
    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
}

function irParaCadastro() {
    window.location.href = "front-end-login.html";
}

function irParaCadastro() {
    window.location.assign(
        "https://flow-core-frontend.vercel.app/front-end-cadastro.html"
    );
}
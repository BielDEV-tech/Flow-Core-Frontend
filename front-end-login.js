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
    const cpf = document.querySelector("#cpf").value.trim();
    const senha = document.querySelector("#senha").value;
    const mensagem = document.querySelector("#mensagem");

    mensagem.textContent = "";

    if (!cpf || !senha) {
        mostrarErro("Preencha o CPF e a senha para continuar.");
        return;
    }

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
            mostrarErro(
                resposta.status === 401
                    ? "CPF ou senha inválidos. Confira seus dados e tente novamente."
                    : (dados.detail || "Não foi possível realizar o login.")
            );

            return;
        }

        const token =
            dados["chave de acesso"] ??
            dados.access_token;

        if (!token) {
            mostrarErro("O servidor não retornou o token de acesso.");
            return;
        }

        localStorage.setItem("token", token);

        const querAvaliar =
            localStorage.getItem("avaliar");

        if (querAvaliar === "true") {
            window.location.href = "index.html";
            return;
        }

        window.location.href = "index.html";

    } catch (erro) {
        console.error(erro);

        mostrarErro(
            "Não foi possível conectar ao servidor. Tente novamente."
        );
    }
}

function irParaCadastro() {
    window.location.href = "front-end-login.html";
}

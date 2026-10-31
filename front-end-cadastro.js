
const API_URL = "https://flow-core-api.onrender.com";

const formulario = document.querySelector("#formCadastro");
const botao = document.querySelector("#botaoCadastrar");
const mensagem = document.querySelector("#mensagem");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.querySelector("#nome").value.trim();
    const cpf = document.querySelector("#cpf").value.trim();
    const email = document.querySelector("#email").value.trim();
    const senha = document.querySelector("#senha").value;
    const confirmarSenha = document.querySelector("#confirmarSenha").value;

    mensagem.textContent = "";
    mensagem.classList.remove("sucesso");

    if (!nome || !cpf || !email || !senha || !confirmarSenha) {
        mensagem.textContent = "Preencha todos os campos.";
        return;
    }

    if (senha.length < 8) {
        mensagem.textContent = "A senha precisa ter pelo menos 8 caracteres.";
        return;
    }

    if (senha !== confirmarSenha) {
        mensagem.textContent = "As senhas não são iguais.";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Criando conta...";

    try {
        const resposta = await fetch(`${API_URL}/criar_user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: nome,
                cpf: cpf,
                email: email,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error("Erro da API:", dados);

            mensagem.textContent =
                typeof dados.detail === "string"
                    ? dados.detail
                    : "Não foi possível criar sua conta.";

            return;
        }

        mensagem.classList.add("sucesso");
        mensagem.textContent = "Conta criada com sucesso! Redirecionando...";

        formulario.reset();

        setTimeout(() => {
            window.location.href = "./front-end-login.html";
        }, 1500);

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        mensagem.textContent = "Não foi possível conectar ao servidor.";

    } finally {
        botao.disabled = false;
        botao.textContent = "Criar conta";
    }
});

async function login() {

    const cpf = document.querySelector("#cpf").value
    const senha = document.querySelector("#senha").value

    const mensagem = document.querySelector("#mensagem")

    if (!cpf || !senha) {

        mensagem.textContent = "Preencha CPF e senha."

        return
    }

    try {

        const resposta = await fetch(
            "https://flow-core-s5ik.onrender.com/login_usuario",
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
        )

        const dados = await resposta.json()

        if (!resposta.ok) {

            mensagem.textContent =
                dados.detail || "CPF ou Senha Invalidos"

            return
        }

        // Salva o token do cliente
        localStorage.setItem(
            "token",
            dados["chave de acesso"]
        )

        /*
        Verifica se o usuário veio
        para fazer uma avaliação.
        */

        const querAvaliar =
            localStorage.getItem("avaliar")

        if (querAvaliar === "true") {

            window.location.href = "index.html"

            return
        }

        // Login normal
        window.location.href = "index.html"

    } catch (erro) {

        console.error(erro)

        mensagem.textContent =
            "Erro ao conectar com o servidor."
    }
}


function irParaCadastro() {

    window.location.href = "front-end-login.html"

}
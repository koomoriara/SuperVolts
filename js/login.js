const formLogin = document.querySelector("#formLogin");
const toggleSenha = document.querySelector("#toggleSenha");
const campoSenha = document.querySelector("#senha");
const erroLogin = document.querySelector("#erroLogin");

toggleSenha.addEventListener("click", () => {
  const mostrar = campoSenha.type === "password";
  campoSenha.type = mostrar ? "text" : "password";
  toggleSenha.innerHTML = `<i class="bi bi-${mostrar ? "eye-slash" : "eye"}"></i>`;
});

formLogin.addEventListener("submit", async evento => {
  evento.preventDefault();
  erroLogin.textContent = "";
  const email = document.querySelector("#email").value.trim();
  const senha = campoSenha.value;

  if (!email || !senha) {
    erroLogin.textContent = "Preencha o e-mail e a senha.";
    return;
  }

  try {
    await fazerLogin(email, senha);
    window.location.href = "dashboard.html";
  } catch (erro) {
    erroLogin.textContent = erro.message;
  }
});

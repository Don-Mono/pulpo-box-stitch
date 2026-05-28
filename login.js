(function () {
  const form = document.querySelector("#roleLoginForm");
  const status = document.querySelector("#loginStatus");
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = `status ${type}`.trim();
  }

  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) window.location.href = "/dashboard.html";
    } catch {
      // Keep the login form visible.
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Validando acceso...");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo iniciar sesion.");
      setStatus("Acceso confirmado.", "ok");
      window.location.href = payload.redirectTo || "/dashboard.html";
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  checkSession();
})();

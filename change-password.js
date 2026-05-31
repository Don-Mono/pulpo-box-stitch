(function () {
  const rolePill = document.querySelector("#securityRolePill");
  const userEmail = document.querySelector("#userEmail");
  const securityIntro = document.querySelector("#securityIntro");
  const changePasswordForm = document.querySelector("#changePasswordForm");
  const passwordStatus = document.querySelector("#passwordStatus");
  const logoutButton = document.querySelector("#logoutButton");

  function setStatus(message, type = "") {
    passwordStatus.textContent = message;
    passwordStatus.className = `status ${type}`.trim();
  }

  async function requireSupportedSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      window.location.href = "/login.html";
      return null;
    }

    const payload = await response.json();
    const user = payload.user || {};
    if (!["coach", "student"].includes(user.role)) {
      window.location.href = "/dashboard.html";
      return null;
    }

    rolePill.textContent = user.role === "coach" ? "Coach" : "Alumno";
    securityIntro.textContent = user.role === "coach"
      ? "Renueva tu acceso privado para proteger las rutinas y el seguimiento de tus alumnos."
      : "Renueva tu acceso privado para proteger tu progreso, rutinas y marcas personales.";
    userEmail.textContent = user.email || "";
    return user;
  }

  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(changePasswordForm);
    const body = Object.fromEntries(formData.entries());

    if (body.new_password !== body.confirm_password) {
      setStatus("La confirmacion no coincide con la nueva clave.", "error");
      return;
    }

    setStatus("Actualizando clave...");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar la clave.");
      changePasswordForm.reset();
      setStatus(payload.message || "Clave actualizada correctamente.", "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  requireSupportedSession();
})();

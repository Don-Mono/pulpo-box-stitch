(function () {
  const rolePill = document.querySelector("#rolePill");
  const title = document.querySelector("#dashboardTitle");
  const intro = document.querySelector("#dashboardIntro");
  const userEmail = document.querySelector("#userEmail");
  const systemStatus = document.querySelector("#systemStatus");
  const logoutButton = document.querySelector("#logoutButton");
  const modules = Array.from(document.querySelectorAll("[data-module-role]"));

  const roleLabels = {
    admin: "Administrador",
    coach: "Coach",
    student: "Alumno",
  };

  function applyRole(user) {
    const role = user.role || "student";
    const label = roleLabels[role] || role;

    rolePill.textContent = label;
    title.textContent = `Panel ${label}`;
    intro.textContent = role === "admin"
      ? "Tienes acceso al admin actual y a la base de los nuevos modulos de gestion."
      : "Tu panel privado esta preparado para los modulos de rutinas y progreso.";
    userEmail.textContent = user.email || "";
    systemStatus.textContent = "Base privada activa. Los modulos de alumnos, rutinas y progreso se activaran por etapas.";

    modules.forEach((module) => {
      const allowedRoles = String(module.dataset.moduleRole || "").split(" ");
      module.hidden = !allowedRoles.includes(role);
    });
  }

  async function boot() {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        window.location.href = "/login.html";
        return;
      }
      const payload = await response.json();
      applyRole(payload.user || {});
    } catch {
      window.location.href = "/login.html";
    }
  }

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  boot();
})();

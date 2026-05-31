(function () {
  const rolePill = document.querySelector("#rolePill");
  const title = document.querySelector("#dashboardTitle");
  const intro = document.querySelector("#dashboardIntro");
  const userEmail = document.querySelector("#userEmail");
  const systemStatus = document.querySelector("#systemStatus");
  const changePasswordLink = document.querySelector("#changePasswordLink");
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
      : role === "coach"
        ? "Tu sesion de coach ya puede revisar alumnos, dejar feedback tecnico y crear rutinas para tus asignados."
        : "Tu panel de alumno ya existe para ver rutinas y registrar marcas personales.";
    userEmail.textContent = user.email || "";
    systemStatus.textContent = role === "admin"
      ? "Base privada activa. Los modulos de alumnos, coaches, sedes, rutinas, resultados y progreso ya tienen base operativa."
      : role === "coach"
        ? "Sesion validada. Ya tienes panel propio, feedback sobre resultados y un modulo dedicado para crear rutinas."
        : "Sesion validada. El panel alumno ya registra marcas sobre ejercicios de sus rutinas asignadas.";
    changePasswordLink.hidden = !["coach", "student"].includes(role);

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

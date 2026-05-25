(function () {
  const sections = [
    { id: "brand", title: "Marca", hint: "Nombre principal y texto del footer." },
    { id: "hero", title: "Inicio", hint: "Primer pantallazo, imagen principal y estadisticas." },
    { id: "valueProps", title: "Propuesta", hint: "Bloque de beneficios iniciales." },
    { id: "contact", title: "Contacto", hint: "Titulo del formulario y mensaje para WhatsApp." },
    { id: "services", title: "Programas", hint: "Tarjetas de servicios y sus imagenes." },
    { id: "schedule", title: "Horarios", hint: "Titulo de la seccion horarios." },
    { id: "pricing", title: "Planes", hint: "Titulo de la seccion pricing." },
    { id: "benefits", title: "Beneficios", hint: "Bloque de beneficios de salud y comunidad." },
    { id: "discounts", title: "Convenios", hint: "Descuentos y alianzas con comercios o comunidades." },
    { id: "locations", title: "Sedes", hint: "Direcciones, imagenes y enlaces a Maps." },
    { id: "coaches", title: "Coaches", hint: "Nombres, roles, descripciones e imagenes." },
    { id: "instagram", title: "Galeria", hint: "Imagenes del bloque Instagram." },
  ];

  const state = {
    activeSection: "brand",
    content: {},
    defaults: window.PULPO_DEFAULT_CONTENT,
    gallery: window.PULPO_GALLERY_IMAGES || [],
  };

  const $ = (selector) => document.querySelector(selector);
  const MAX_ADMIN_UPLOAD_BYTES = 3 * 1024 * 1024;

  function getPath(path) {
    return path.split(".").reduce((current, key) => current?.[key], state.content);
  }

  function setPath(path, value) {
    const keys = path.split(".");
    let target = state.content;
    keys.slice(0, -1).forEach((key) => {
      if (target[key] == null) target[key] = Number.isNaN(Number(key)) ? {} : [];
      target = target[key];
    });
    target[keys.at(-1)] = value;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setStatus(element, message, type = "") {
    element.textContent = message;
    element.className = `status ${type}`.trim();
  }

  function inputField(path, label, options = {}) {
    const value = getPath(path) ?? "";
    const id = path.replace(/[^a-z0-9]/gi, "-");
    const tag = options.multiline ? "textarea" : "input";
    const input = tag === "textarea"
      ? `<textarea id="${id}" data-path="${path}">${escapeHtml(value)}</textarea>`
      : `<input id="${id}" data-path="${path}" value="${escapeHtml(value)}" />`;
    return `<div class="field ${options.full ? "full" : ""}"><label for="${id}">${label}</label>${input}</div>`;
  }

  function imageField(path, label) {
    const value = getPath(path) || "";
    const id = path.replace(/[^a-z0-9]/gi, "-");
    const options = state.gallery
      .map((url) => `<option value="${url}" ${url === value ? "selected" : ""}>${url.split("/").pop()}</option>`)
      .join("");
    return `
      <div class="field full">
        <label for="${id}">${label}</label>
        <div class="image-row">
          <img src="${escapeHtml(value || state.gallery[0] || "")}" alt="">
          <div>
            <input id="${id}" data-path="${path}" value="${escapeHtml(value)}" placeholder="URL de imagen" />
            <select data-image-select="${path}">
              <option value="">Elegir foto de la carpeta</option>
              ${options}
            </select>
            <input data-upload="${path}" type="file" accept="image/png,image/jpeg,image/webp" />
          </div>
        </div>
      </div>
    `;
  }

  function scheduleSlotsField(path, label) {
    const value = Array.isArray(getPath(path)) ? getPath(path).join("\n") : "";
    const id = path.replace(/[^a-z0-9]/gi, "-");
    return `
      <div class="field full">
        <label for="${id}">${label}</label>
        <textarea id="${id}" data-slots-path="${path}" placeholder="Una fila por horario. Usa -- para vacio y --- para bloque destacado.">${escapeHtml(value)}</textarea>
      </div>
    `;
  }

  function itemCard(title, fields, actions = "") {
    return `
      <div class="item-card">
        <div class="item-card-header">
          <h3>${title}</h3>
          ${actions}
        </div>
        <div class="grid">${fields.join("")}</div>
      </div>
    `;
  }

  function ensureArray(path) {
    const value = getPath(path);
    if (Array.isArray(value)) return value;
    setPath(path, []);
    return getPath(path);
  }

  function createCoach() {
    return {
      name: "Nuevo coach",
      role: "COACH",
      text: "Agrega una descripcion breve del coach.",
      image: state.gallery[0] || "/assets/brand/coach-javier.jpeg",
    };
  }

  function renderCoachesFields() {
    const coaches = ensureArray("coaches.cards");
    const visibleCoaches = coaches.length ? coaches : [createCoach()];
    if (!coaches.length) setPath("coaches.cards", visibleCoaches);

    return [
      inputField("coaches.heading", "Titulo", { full: true }),
      `<div class="section-actions"><button class="button accent" data-add-coach type="button">Agregar coach</button></div>`,
      ...visibleCoaches.map((_, index) =>
        itemCard(
          `Coach ${index + 1}`,
          [
            inputField(`coaches.cards.${index}.name`, "Nombre"),
            inputField(`coaches.cards.${index}.role`, "Rol"),
            inputField(`coaches.cards.${index}.text`, "Descripcion", { multiline: true, full: true }),
            imageField(`coaches.cards.${index}.image`, "Imagen"),
          ],
          visibleCoaches.length > 1
            ? `<button class="button danger compact" data-remove-coach="${index}" type="button">Eliminar</button>`
            : "",
        ),
      ),
    ].join("");
  }

  function renderFields() {
    const id = state.activeSection;

    if (id === "brand") {
      return [
        inputField("brand.name", "Nombre de marca"),
        inputField("brand.footerText", "Texto footer", { multiline: true, full: true }),
      ].join("");
    }

    if (id === "hero") {
      const stats = [0, 1, 2].map((index) =>
        itemCard(`Estadistica ${index + 1}`, [
          inputField(`hero.stats.${index}.value`, "Valor"),
          inputField(`hero.stats.${index}.label`, "Etiqueta"),
        ]),
      );
      return [
        inputField("hero.titleHtml", "Titulo principal", { multiline: true, full: true }),
        inputField("hero.subtitle", "Bajada", { multiline: true, full: true }),
        imageField("hero.image", "Imagen hero"),
        inputField("hero.primaryCta", "Boton planes"),
        inputField("hero.secondaryCta", "Boton clase"),
        ...stats,
      ].join("");
    }

    if (id === "valueProps") {
      return [
        inputField("valueProps.headingHtml", "Titulo", { multiline: true, full: true }),
        ...[0, 1, 2, 3].map((index) =>
          itemCard(`Item ${index + 1}`, [
            inputField(`valueProps.items.${index}.title`, "Titulo"),
            inputField(`valueProps.items.${index}.text`, "Texto", { multiline: true, full: true }),
          ]),
        ),
      ].join("");
    }

    if (id === "contact") {
      return [
        inputField("contact.heading", "Titulo", { full: true }),
        inputField("contact.whatsappMessage", "Mensaje inicial WhatsApp", { multiline: true, full: true }),
      ].join("");
    }
    if (id === "schedule") {
      return [
        inputField("schedule.heading", "Titulo general", { full: true }),
        ...[0, 1, 2].map((index) =>
          itemCard(`Horario ${index + 1}`, [
            inputField(`schedule.tabs.${index}.label`, "Etiqueta boton"),
            inputField(`schedule.tabs.${index}.caption`, "Bajada", { full: true }),
            imageField(`schedule.tabs.${index}.image`, "Imagen de fondo"),
            ...Array.from({ length: 6 }, (_, dayIndex) =>
              itemCard(`Dia ${dayIndex + 1}`, [
                inputField(`schedule.tabs.${index}.days.${dayIndex}.label`, "Dia"),
                scheduleSlotsField(`schedule.tabs.${index}.days.${dayIndex}.slots`, "Horarios"),
              ]),
            ),
          ]),
        ),
      ].join("");
    }
    if (id === "pricing") return inputField("pricing.heading", "Titulo", { full: true });

    if (id === "services") {
      return [
        inputField("services.heading", "Titulo", { full: true }),
        ...[0, 1, 2].map((index) =>
          itemCard(`Programa ${index + 1}`, [
            inputField(`services.cards.${index}.title`, "Titulo"),
            inputField(`services.cards.${index}.text`, "Texto", { multiline: true, full: true }),
            imageField(`services.cards.${index}.image`, "Imagen"),
          ]),
        ),
      ].join("");
    }

    if (id === "benefits") {
      return [
        inputField("benefits.heading", "Titulo", { full: true }),
        ...[0, 1, 2].map((index) =>
          itemCard(`Beneficio ${index + 1}`, [
            inputField(`benefits.cards.${index}.title`, "Titulo"),
            inputField(`benefits.cards.${index}.text`, "Texto", { multiline: true, full: true }),
            imageField(`benefits.cards.${index}.image`, "Imagen"),
          ]),
        ),
      ].join("");
    }

    if (id === "discounts") {
      return [
        inputField("discounts.heading", "Titulo", { full: true }),
        inputField("discounts.subtitle", "Bajada", { multiline: true, full: true }),
        ...[0, 1, 2, 3, 4, 5].map((index) =>
          itemCard(`Convenio ${index + 1}`, [
            inputField(`discounts.cards.${index}.tag`, "Etiqueta"),
            inputField(`discounts.cards.${index}.title`, "Titulo"),
            inputField(`discounts.cards.${index}.subtitle`, "Subtitulo", { full: true }),
            inputField(`discounts.cards.${index}.highlight`, "Destacado"),
            inputField(`discounts.cards.${index}.text`, "Descripcion", { multiline: true, full: true }),
            imageField(`discounts.cards.${index}.image`, "Imagen"),
          ]),
        ),
      ].join("");
    }

    if (id === "locations") {
      return [
        inputField("locations.heading", "Titulo", { full: true }),
        ...[0, 1].map((index) =>
          itemCard(`Sede ${index + 1}`, [
            inputField(`locations.cards.${index}.title`, "Nombre"),
            inputField(`locations.cards.${index}.address`, "Direccion", { full: true }),
            inputField(`locations.cards.${index}.whatsapp`, "WhatsApp sede (ej: 56912345678)", { full: true }),
            inputField(`locations.cards.${index}.mapUrl`, "Link Google Maps", { full: true }),
            imageField(`locations.cards.${index}.image`, "Imagen"),
          ]),
        ),
      ].join("");
    }

    if (id === "coaches") {
      return renderCoachesFields();
    }

    if (id === "instagram") {
      return [
        inputField("instagram.heading", "Titulo", { full: true }),
        ...[0, 1, 2, 3, 4, 5].map((index) => imageField(`instagram.images.${index}`, `Imagen ${index + 1}`)),
      ].join("");
    }

    return "";
  }

  function renderNav() {
    $("#sectionNav").innerHTML = sections
      .map((section) => `<button class="nav-button ${section.id === state.activeSection ? "is-active" : ""}" data-section="${section.id}" type="button">${section.title}</button>`)
      .join("");
  }

  function renderEditor() {
    const section = sections.find((item) => item.id === state.activeSection);
    $("#sectionTitle").textContent = section.title;
    $("#sectionHint").textContent = section.hint;
    $("#editorForm").innerHTML = renderFields();
    bindForm();
    renderNav();
  }

  function bindForm() {
    $("#editorForm").querySelectorAll("[data-path]").forEach((input) => {
      input.addEventListener("input", () => {
        setPath(input.dataset.path, input.value);
        updatePreview(input);
      });
    });

    $("#editorForm").querySelectorAll("[data-image-select]").forEach((select) => {
      select.addEventListener("change", () => {
        if (!select.value) return;
        const path = select.dataset.imageSelect;
        setPath(path, select.value);
        const input = $(`[data-path="${cssEscape(path)}"]`);
        if (input) input.value = select.value;
        updatePreview(input);
      });
    });

    $("#editorForm").querySelectorAll("[data-upload]").forEach((input) => {
      input.addEventListener("change", async () => {
        if (!input.files?.[0]) return;
        await uploadImage(input.dataset.upload, input.files[0]);
      });
    });

    $("#editorForm").querySelectorAll("[data-slots-path]").forEach((input) => {
      input.addEventListener("input", () => {
        const slots = input.value
          .split("\n")
          .map((entry) => entry.trim())
          .filter(Boolean);
        setPath(input.dataset.slotsPath, slots);
      });
    });

    $("#editorForm").querySelector("[data-add-coach]")?.addEventListener("click", () => {
      ensureArray("coaches.cards").push(createCoach());
      renderEditor();
      setStatus($("#editorStatus"), "Coach agregado. Recuerda guardar para publicarlo.", "ok");
    });

    $("#editorForm").querySelectorAll("[data-remove-coach]").forEach((button) => {
      button.addEventListener("click", () => {
        const coaches = ensureArray("coaches.cards");
        if (coaches.length <= 1) {
          setStatus($("#editorStatus"), "Debe quedar al menos un coach.", "error");
          return;
        }
        coaches.splice(Number(button.dataset.removeCoach), 1);
        renderEditor();
        setStatus($("#editorStatus"), "Coach eliminado. Recuerda guardar para publicarlo.", "ok");
      });
    });
  }

  function updatePreview(input) {
    const field = input?.closest(".field");
    const image = field?.querySelector("img");
    if (image && input.value) image.src = input.value;
  }

  async function uploadImage(path, file) {
    const status = $("#editorStatus");
    setStatus(status, "Subiendo imagen...");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Solo se permiten imagenes JPG, PNG o WebP.");
      }
      if (file.size > MAX_ADMIN_UPLOAD_BYTES) {
        throw new Error("La imagen supera 3MB. Comprimela antes de subirla.");
      }
      const dataUrl = await fileToDataUrl(file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, fileName: file.name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo subir la imagen.");
      setPath(path, payload.url);
      const input = $(`[data-path="${cssEscape(path)}"]`);
      if (input) {
        input.value = payload.url;
        updatePreview(input);
      }
      setStatus(status, "Imagen subida.", "ok");
    } catch (error) {
      setStatus(status, error.message, "error");
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  async function loadAdminContent() {
    try {
      const response = await fetch("/api/admin/site");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el contenido.");
      state.content = window.PULPO_MERGE_CONTENT(state.defaults, payload.content || {});
      state.adminLoadWarning = "";
    } catch (error) {
      state.content = clone(state.defaults);
      state.adminLoadWarning = `${error.message} Puedes revisar el panel, pero para guardar cambios deben estar configuradas las variables de Supabase.`;
    }
  }

  async function saveContent() {
    const status = $("#editorStatus");
    setStatus(status, "Guardando...");
    try {
      const response = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: state.content }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.hint || payload.error || "No se pudo guardar.");
      setStatus(status, "Cambios publicados.", "ok");
    } catch (error) {
      setStatus(status, error.message, "error");
    }
  }

  async function showEditor() {
    state.content = clone(state.defaults);
    await loadAdminContent();
    $("#loginView").classList.add("hidden");
    $("#editorView").classList.remove("hidden");
    renderEditor();
    if (state.adminLoadWarning) setStatus($("#editorStatus"), state.adminLoadWarning, "error");
  }

  async function boot() {
    try {
      const response = await fetch("/api/admin/me");
      if (response.ok) await showEditor();
    } catch {
      // The login form remains visible.
    }

    $("#email").value = "miguelangelsaez12@gmail.com";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#loginStatus");
    setStatus(status, "Entrando...");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: $("#email").value,
          password: $("#password").value,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo entrar.");
      await showEditor();
    } catch (error) {
      setStatus(status, error.message, "error");
    }
  });

  $("#recoverAccessButton").addEventListener("click", () => {
    setStatus(
      $("#loginStatus"),
      "La clave anterior no se puede recuperar por seguridad. Pide un restablecimiento del acceso; la clave vigente se configura de forma privada en Vercel.",
      "error",
    );
  });

  $("#sectionNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    state.activeSection = button.dataset.section;
    renderEditor();
  });

  $("#saveButton").addEventListener("click", saveContent);

  $("#resetButton").addEventListener("click", () => {
    state.content[state.activeSection] = clone(state.defaults[state.activeSection]);
    renderEditor();
    setStatus($("#editorStatus"), "Seccion restaurada. Guarda para publicarla.", "ok");
  });

  $("#logoutButton").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  });

  boot();
})();

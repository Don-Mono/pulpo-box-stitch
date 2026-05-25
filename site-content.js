(function () {
  const galleryImages = Array.from({ length: 41 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return `/assets/pulpo-gallery/pulpo-gallery-${number}.jpeg`;
  });
  const brandImages = {
    hero: "/assets/brand/hero-team.jpg",
    crossfit: "/assets/brand/gym-class.jpg",
    personal: "/assets/brand/coach-guidance.jpg",
    group: "/assets/brand/team-energy.jpg",
    strength: "/assets/brand/rope-climb.jpg",
    focus: "/assets/brand/coach-board.jpg",
    community: "/assets/brand/team-lineup.jpg",
    manuelPlaza: "/assets/brand/gym-class.jpg",
    bilbao: "/assets/brand/team-energy.jpg",
    convenioPadel: "/assets/brand/convenio-padel.jpeg",
    coachCristian: "/assets/brand/coach-cristian.jpeg",
    coachJavier: "/assets/brand/coach-javier.jpeg",
    instagram1: "/assets/brand/plans-group.jpeg",
    instagram2: "/assets/brand/plans-personal.jpeg",
    instagram3: "/assets/brand/schedule-crossfit.jpeg",
    instagram4: "/assets/brand/schedule-personal.jpeg",
    instagram5: "/assets/brand/competition.jpg",
    instagram6: "/assets/brand/convenio-padel.jpeg",
  };

  const defaultContent = {
    brand: {
      name: "PULPO BOX",
      footerText: "Impulsando el fitness de alto rendimiento en Iquique desde 2016. Unete a la comunidad mas fuerte.",
    },
    hero: {
      titleHtml: "PULPO BOX",
      subtitle: "TU ESPACIO PARA SUPERAR LIMITES. MAS QUE UN GIMNASIO, UNA COMUNIDAD.",
      image: brandImages.hero,
      primaryCta: "VER PLANES",
      secondaryCta: "CLASE DE PRUEBA",
      stats: [
        { value: "2", label: "SEDES" },
        { value: "1h", label: "POR CLASE" },
        { value: "2016", label: "COMUNIDAD ACTIVA" },
      ],
    },
    valueProps: {
      headingHtml: "UNA LANDING MAS CLARA, <br>MAS PREMIUM Y MAS ORIENTADA A CONVERTIR",
      items: [
        { title: "Experiencia Personalizada", text: "Adaptamos cada entrenamiento a tu nivel y objetivos especificos para resultados reales." },
        { title: "Horarios Flexibles", text: "Amplia disponibilidad horaria para que el entrenamiento se ajuste a tu vida, no al reves." },
        { title: "Entrenadores Expertos", text: "Contamos con un equipo altamente calificado para guiarte en cada repeticion." },
        { title: "Comunidad de Motivacion", text: "Entrenar en equipo te empuja a dar lo mejor de ti en un ambiente inigualable." },
      ],
    },
    contact: {
      heading: "HABLA CON LA SEDE QUE TE ACOMODA",
      whatsappMessage: "Hola Pulpo Box, quiero agendar una clase de prueba gratis.",
    },
    services: {
      heading: "ENTRENA CON ESTRUCTURA, ENERGIA Y ACOMPANAMIENTO",
      cards: [
        { title: "CrossFit", text: "WODs dinamicos para fuerza y agilidad.", image: brandImages.crossfit },
        { title: "Personalizados", text: "Enfoque 100% en tus metas individuales.", image: brandImages.personal },
        { title: "Grupales & Open Box", text: "Energia compartida o entrena a tu ritmo.", image: brandImages.group },
      ],
    },
    schedule: {
      heading: "HORARIOS",
      tabs: [
        {
          id: "crossfit-manuel",
          label: "CROSSFIT",
          caption: "Sucursal Manuel Plaza",
          image: brandImages.crossfit,
          days: [
            { label: "LUNES", slots: ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM", "21:00 PM"] },
            { label: "MARTES", slots: ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM", "21:00 PM"] },
            { label: "MIERCOLES", slots: ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM", "21:00 PM"] },
            { label: "JUEVES", slots: ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM", "21:00 PM"] },
            { label: "VIERNES", slots: ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM", "---"] },
            { label: "SABADO", slots: ["--", "--", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM|OPEN BOX", "13:00 PM|OPEN BOX", "---", "--", "--", "--", "---", "--"] },
          ],
        },
        {
          id: "personalizados",
          label: "PERSONALIZADOS",
          caption: "Clases 1 a 1 y objetivos especificos",
          image: brandImages.personal,
          days: [
            { label: "LUNES", slots: ["08:00 AM", "09:00 AM", "10:00 AM", "---", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "MARTES", slots: ["08:00 AM", "09:00 AM", "10:00 AM", "---", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "MIERCOLES", slots: ["08:00 AM", "09:00 AM", "10:00 AM", "---", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "JUEVES", slots: ["08:00 AM", "09:00 AM", "10:00 AM", "---", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "VIERNES", slots: ["08:00 AM", "09:00 AM", "10:00 AM", "---", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "SABADO", slots: ["09:00 AM", "10:00 AM", "11:00 AM"] },
          ],
        },
        {
          id: "bilbao",
          label: "BILBAO",
          caption: "Sucursal Fco. Bilbao",
          image: brandImages.bilbao,
          days: [
            { label: "LUNES", slots: ["08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "MARTES", slots: ["08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "MIERCOLES", slots: ["08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "JUEVES", slots: ["08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "VIERNES", slots: ["08:00 AM", "09:00 AM", "10:00 AM|OPEN BOX", "11:00 AM|OPEN BOX", "--", "--", "---", "17:00 PM", "18:00 PM", "19:00 PM", "20:00 PM"] },
            { label: "SABADO", slots: ["--", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM|OPEN BOX", "--", "---", "--", "--", "--", "--"] },
          ],
        },
      ],
    },
    pricing: {
      heading: "PLANES PULPOBOX",
    },
    benefits: {
      heading: "BENEFICIOS QUE FORTALECEN",
      cards: [
        { title: "Salud Fisica", text: "Mejora tu resistencia cardiovascular, fuerza muscular y flexibilidad en cada sesion.", image: brandImages.strength },
        { title: "Bienestar Mental", text: "Libera estres y mejora tu foco cognitivo a traves del ejercicio de alta intensidad.", image: brandImages.focus },
        { title: "Comunidad", text: "Forma parte de un grupo que te apoya y te impulsa a superar tus limites cada dia.", image: brandImages.community },
      ],
    },
    discounts: {
      heading: "CONVENIOS Y DESCUENTOS",
      subtitle: "Trabajamos con aliados locales para que tu membresia en Pulpo Box tambien se traduzca en beneficios fuera del box.",
      cards: [
        {
          tag: "Pulpo Box",
          title: "Convenio Estudiante",
          subtitle: "Universitario o colegial",
          highlight: "20% DCTO.",
          text: "Presenta tu credencial universitaria o pase escolar en recepcion y accede a una tarifa preferencial para entrenar.",
          image: brandImages.hero,
        },
        {
          tag: "Aliado local",
          title: "Padel Huayquique",
          subtitle: "Beneficio para miembros",
          highlight: "Convenio activo",
          text: "Consulta en recepcion el descuento vigente y la forma de activarlo como parte de la comunidad Pulpo Box.",
          image: brandImages.convenioPadel,
        },
        {
          tag: "Comercios asociados",
          title: "Mas aliados de la ciudad",
          subtitle: "Espacio para nuevos convenios",
          highlight: "Nuevos beneficios",
          text: "La seccion queda lista para mostrar descuentos con cafeterias, tiendas o servicios asociados que quieras sumar despues.",
          image: brandImages.group,
        },
      ],
    },
    locations: {
      heading: "DOS PUNTOS DE CONTACTO PARA EMPEZAR A ENTRENAR",
      cards: [
        {
          title: "Manuel Plaza",
          address: "Manuel Plaza 2178, Iquique, Chile.",
          whatsapp: "56938794624",
          image: brandImages.manuelPlaza,
          mapUrl: "https://www.google.com/maps/search/?api=1&query=Pulpo%20Box%20Manuel%20Plaza%202178%2C%20Iquique%2C%20Chile",
        },
        {
          title: "Bilbao",
          address: "Francisco Bilbao 3418, Iquique, Chile.",
          whatsapp: "56938794624",
          image: brandImages.bilbao,
          mapUrl: "https://www.google.com/maps/search/?api=1&query=Pulpo%20Box%20Francisco%20Bilbao%203418%2C%20Iquique%2C%20Chile",
        },
      ],
    },
    coaches: {
      heading: "PERSONAS REALES GUIANDO TU PROGRESO",
      cards: [
        {
          name: "Cristian Saez Munoz",
          role: "HEAD COACH",
          text: "Especialista en levantamiento olimpico y programacion deportiva de alto rendimiento. 10 anos de experiencia.",
          image: brandImages.coachCristian,
        },
        {
          name: "Javier Andres Pavelec",
          role: "COACH CROSSFIT L1",
          text: "Experto en gimnasia deportiva y movilidad. Apasionado por la tecnica perfecta y la seguridad de los atletas.",
          image: brandImages.coachJavier,
        },
        {
          name: "Equipo Pulpo Box",
          role: "PERSONALIZADOS",
          text: "Acompanamiento cercano para objetivos especificos y progresos medibles.",
          image: brandImages.personal,
        },
        {
          name: "Comunidad Activa",
          role: "CROSSFIT Y GRUPALES",
          text: "Energia de grupo, estructura y apoyo constante dentro de cada entrenamiento.",
          image: brandImages.group,
        },
      ],
    },
    instagram: {
      heading: "Instagram @pulpobox",
      images: [
        brandImages.instagram1,
        brandImages.instagram2,
        brandImages.instagram3,
        brandImages.instagram4,
        brandImages.instagram5,
        brandImages.instagram6,
      ],
    },
  };

  function mergeDeep(base, override) {
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (!base || typeof base !== "object") return override ?? base;
    const output = { ...base };
    Object.keys(override || {}).forEach((key) => {
      output[key] = mergeDeep(base[key], override[key]);
    });
    return output;
  }

  function setText(selector, value, root = document) {
    const element = root.querySelector(selector);
    if (element && value != null) element.textContent = value;
  }

  function setHtml(selector, value, root = document) {
    const element = root.querySelector(selector);
    if (element && value != null) element.innerHTML = value;
  }

  function setImage(selector, value, root = document) {
    const element = root.querySelector(selector);
    if (element && value) element.src = value;
  }

  function revealHeroImage() {
    const image = document.querySelector("#inicio .hero-background-image");
    if (!image) return;

    const show = () => image.classList.add("is-loaded");
    if (image.complete) {
      show();
    } else {
      image.addEventListener("load", show, { once: true });
      image.addEventListener("error", show, { once: true });
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderCoachCard(item, hidden = false) {
    return `
      <article class="coach-card"${hidden ? ' aria-hidden="true"' : ""}>
        <img alt="${hidden ? "" : escapeHtml(item.name)}" src="${escapeHtml(item.image)}"/>
        <div class="coach-card-body">
          <h3 class="font-display-lg text-headline-md text-white">${escapeHtml(item.name)}</h3>
          <span class="coach-card-role">${escapeHtml(item.role)}</span>
          <p>${escapeHtml(item.text)}</p>
        </div>
      </article>
    `;
  }

  function ensureSectionLogo(sectionSelector) {
    const section = document.querySelector(sectionSelector);
    if (!section || section.querySelector(":scope img.section-logo")) return;

    const heading = section.querySelector("h2");
    if (!heading) return;

    const logo = document.createElement("img");
    logo.alt = "Logo Pulpo Box";
    logo.className = "section-logo section-logo-sm";
    logo.src = "/assets/brand/pulpo-box-logo.png";
    heading.before(logo);
  }

  function applyRepeating(selector, items, updater) {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (items[index]) updater(element, items[index], index);
    });
  }

  function applySiteContent(content) {
    const data = mergeDeep(defaultContent, content || {});

    setText("nav .font-display-lg", data.brand.name);
    setText("nav button[data-scroll-target='#contacto']", "Prueba Gratis");
    setImage("#inicio img", data.hero.image);
    setHtml("#inicio h1", data.hero.titleHtml);
    setText("#inicio .font-body-md.text-on-primary-container", data.hero.subtitle);
    setText("#inicio button[data-scroll-target='#planes']", data.hero.primaryCta);
    setText("#inicio button[data-scroll-target='#contacto']", data.hero.secondaryCta);
    applyRepeating("#inicio .grid .text-display-lg-mobile", data.hero.stats, (element, item) => {
      element.textContent = item.value;
    });
    applyRepeating("#inicio .grid .text-label-caps", data.hero.stats, (element, item) => {
      element.textContent = item.label;
    });

    setHtml("section:nth-of-type(2) h2", data.valueProps.headingHtml);
    applyRepeating("section:nth-of-type(2) .grid > div", data.valueProps.items, (element, item) => {
      setText("h3", item.title, element);
      setText("p", item.text, element);
    });

    setText("#contacto h2", data.contact.heading);
    applyRepeating("#contacto select[name='preferred_location'] option", data.locations.cards, (element, item, index) => {
      element.textContent = item.title;
      element.value = index === 1 ? "bilbao" : "manuel_plaza";
    });
    ensureSectionLogo("#servicios");
    setText("#servicios h2", data.services.heading);
    applyRepeating("#servicios .service-card", data.services.cards, (element, item) => {
      setImage("img", item.image, element);
      setText("h3", item.title, element);
      setText("p", item.text, element);
    });

    setText("#horarios h2", data.schedule.heading);
    setText("#planes h2", data.pricing.heading);

    const benefits = document.querySelector("#planes")?.nextElementSibling;
    if (benefits) {
      setText("h2", data.benefits.heading, benefits);
      applyRepeating(":scope .grid > div", data.benefits.cards, (element, item) => {
        setImage("img", item.image, element);
        setText("h3", item.title, element);
        setText("p", item.text, element);
      });
    }

    const discounts = document.querySelector("#convenios");
    if (discounts) {
      ensureSectionLogo("#convenios");
      setText("h2", data.discounts.heading, discounts);
      setText(".discounts-intro", data.discounts.subtitle, discounts);
      discounts.dataset.discountCount = String((data.discounts.cards || []).length);
    }

    ensureSectionLogo("#sedes");
    setText("#sedes h2", data.locations.heading);
    applyRepeating("#sedes .grid > div", data.locations.cards, (element, item) => {
      setImage("img", item.image, element);
      setText("h3", item.title, element);
      setText("p", item.address, element);
      const link = element.querySelector("a");
      if (link && item.mapUrl) link.href = item.mapUrl;
    });

    setText("#coaches h2", data.coaches.heading);
    const coachesTrack = document.querySelector("#coaches-track");
    if (coachesTrack) {
      const defaultCoaches = defaultContent.coaches.cards;
      const coaches = (data.coaches.cards?.length ? data.coaches.cards : defaultCoaches)
        .filter((coach) => coach?.name || coach?.role || coach?.text || coach?.image);
      const visibleCoaches = coaches.length ? coaches : defaultCoaches;
      coachesTrack.innerHTML = [
        ...visibleCoaches.map((item) => renderCoachCard(item)),
        ...visibleCoaches.map((item) => renderCoachCard(item, true)),
        ...visibleCoaches.map((item) => renderCoachCard(item, true)),
      ].join("");
    }

    setText("#contacto-footer .font-display-lg", data.brand.name);
    setText("#contacto-footer .lg\\:col-span-1 p", data.brand.footerText);
    setText("#contacto-footer .lg\\:col-span-2 h4", data.instagram.heading);
    applyRepeating("#contacto-footer .lg\\:col-span-2 .grid > div", data.instagram.images.map((image) => ({ image })), (element, item) => {
      setImage("img", item.image, element);
    });

    window.PULPO_ACTIVE_CONTENT = data;
    document.dispatchEvent(new CustomEvent("pulpo:content-applied", { detail: data }));

    return data;
  }

  async function loadPublishedContent() {
    try {
      const response = await fetch("/api/site", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("No site content");
      const payload = await response.json();
      return payload.content || {};
    } catch {
      return {};
    }
  }

  window.PULPO_GALLERY_IMAGES = [...new Set([...galleryImages, ...Object.values(brandImages)])];
  window.PULPO_DEFAULT_CONTENT = defaultContent;
  window.PULPO_MERGE_CONTENT = mergeDeep;
  window.PULPO_APPLY_CONTENT = applySiteContent;
  window.PULPO_LOAD_CONTENT = loadPublishedContent;

  document.addEventListener("DOMContentLoaded", async () => {
    applySiteContent(await loadPublishedContent());
    revealHeroImage();
  });
})();

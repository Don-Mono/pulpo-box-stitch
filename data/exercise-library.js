// Generado desde C:/Users/Gamer/Downloads/Glosario.xlsx
// Fuente: glosario Pulpo Box con ejercicios, progresiones, movilidad y core.

const EXERCISE_LIBRARY_COLUMNS = [
  "id",
  "section",
  "category",
  "subcategory",
  "name",
  "movement_type",
  "difficulty",
];

const EXERCISE_LIBRARY_ROWS = [
  [
    "ejercicios-001",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Snatch",
    "Explosivo",
    "Avanzado"
  ],
  [
    "ejercicios-002",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Power Snatch",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-003",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Hang Snatch",
    "Técnico",
    "Intermedio"
  ],
  [
    "ejercicios-004",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Hang Power Snatch",
    "Técnico",
    "Intermedio"
  ],
  [
    "ejercicios-005",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Snatch Balance",
    "Estabilidad",
    "Avanzado"
  ],
  [
    "ejercicios-006",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Overhead Squat",
    "Control",
    "Avanzado"
  ],
  [
    "ejercicios-007",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Muscle Snatch",
    "Técnico",
    "Intermedio"
  ],
  [
    "ejercicios-008",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Snatch Pull",
    "Fuerza",
    "Intermedio"
  ],
  [
    "ejercicios-009",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "High Pull Snatch",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-010",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Snatch Deadlift",
    "Fuerza",
    "Básico"
  ],
  [
    "ejercicios-011",
    "Ejercicios",
    "Halterofilia",
    "Snatch",
    "Complex Snatch",
    "Coordinación",
    "Avanzado"
  ],
  [
    "ejercicios-012",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Clean",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-013",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Power Clean",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-014",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Hang Clean",
    "Técnico",
    "Intermedio"
  ],
  [
    "ejercicios-015",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Front Squat",
    "Fuerza",
    "Intermedio"
  ],
  [
    "ejercicios-016",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Clean Pull",
    "Fuerza",
    "Intermedio"
  ],
  [
    "ejercicios-017",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Push Press",
    "Potencia",
    "Intermedio"
  ],
  [
    "ejercicios-018",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Push Jerk",
    "Técnico",
    "Intermedio"
  ],
  [
    "ejercicios-019",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Split Jerk",
    "Técnico",
    "Avanzado"
  ],
  [
    "ejercicios-020",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Jerk Balance",
    "Control",
    "Avanzado"
  ],
  [
    "ejercicios-021",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Jerk Drive",
    "Potencia",
    "Intermedio"
  ],
  [
    "ejercicios-022",
    "Ejercicios",
    "Halterofilia",
    "Clean & Jerk",
    "Clean Deadlift",
    "Fuerza",
    "Básico"
  ],
  [
    "ejercicios-023",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Pull Up",
    "Tracción",
    "Básico"
  ],
  [
    "ejercicios-024",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Chin Up",
    "Tracción",
    "Básico"
  ],
  [
    "ejercicios-025",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Chest to Bar",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-026",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Butterfly Pull Up",
    "Técnico",
    "Avanzado"
  ],
  [
    "ejercicios-027",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Muscle Up Bar",
    "Complejo",
    "Avanzado"
  ],
  [
    "ejercicios-028",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Muscle Up Rings",
    "Complejo",
    "Avanzado"
  ],
  [
    "ejercicios-029",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Toes to Bar",
    "Core",
    "Intermedio"
  ],
  [
    "ejercicios-030",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Kipping Pull Up",
    "Técnico",
    "Intermedio"
  ],
  [
    "ejercicios-031",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Strict Pull Up",
    "Fuerza",
    "Intermedio"
  ],
  [
    "ejercicios-032",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "L-Sit Pull Up",
    "Core",
    "Avanzado"
  ],
  [
    "ejercicios-033",
    "Ejercicios",
    "Gimnásticos",
    "Pulling",
    "Arch/Hollow Swing",
    "Técnico",
    "Básico"
  ],
  [
    "ejercicios-034",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Push Up",
    "Empuje",
    "Básico"
  ],
  [
    "ejercicios-035",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Ring Push Up",
    "Empuje",
    "Intermedio"
  ],
  [
    "ejercicios-036",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Dips",
    "Empuje",
    "Intermedio"
  ],
  [
    "ejercicios-037",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Ring Dips",
    "Empuje",
    "Avanzado"
  ],
  [
    "ejercicios-038",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Handstand Push Up",
    "Vertical",
    "Avanzado"
  ],
  [
    "ejercicios-039",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Pike Push Up",
    "Vertical",
    "Intermedio"
  ],
  [
    "ejercicios-040",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Wall Walk",
    "Control",
    "Intermedio"
  ],
  [
    "ejercicios-041",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Handstand Hold",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "ejercicios-042",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Deficit HSPU",
    "Fuerza",
    "Avanzado"
  ],
  [
    "ejercicios-043",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Kipping HSPU",
    "Técnico",
    "Avanzado"
  ],
  [
    "ejercicios-044",
    "Ejercicios",
    "Gimnásticos",
    "Push",
    "Strict HSPU",
    "Fuerza",
    "Avanzado"
  ],
  [
    "ejercicios-045",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Row",
    "Resistencia",
    "Básico"
  ],
  [
    "ejercicios-046",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Bike",
    "Resistencia",
    "Básico"
  ],
  [
    "ejercicios-047",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Ski Erg",
    "Resistencia",
    "Intermedio"
  ],
  [
    "ejercicios-048",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Assault Bike Sprint",
    "Potencia",
    "Intermedio"
  ],
  [
    "ejercicios-049",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Row Sprint",
    "Potencia",
    "Intermedio"
  ],
  [
    "ejercicios-050",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Bike Intervals",
    "Resistencia",
    "Intermedio"
  ],
  [
    "ejercicios-051",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Ski Erg Sprint",
    "Potencia",
    "Intermedio"
  ],
  [
    "ejercicios-052",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Mixed Erg",
    "Mixto",
    "Avanzado"
  ],
  [
    "ejercicios-053",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Cal Bike",
    "Resistencia",
    "Básico"
  ],
  [
    "ejercicios-054",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Cal Row",
    "Resistencia",
    "Básico"
  ],
  [
    "ejercicios-055",
    "Ejercicios",
    "Cardio",
    "Máquinas",
    "Intervalos erg",
    "Resistencia",
    "Intermedio"
  ],
  [
    "ejercicios-056",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Running",
    "Resistencia",
    "Básico"
  ],
  [
    "ejercicios-057",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Sprint",
    "Potencia",
    "Intermedio"
  ],
  [
    "ejercicios-058",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Shuttle Run",
    "Agilidad",
    "Intermedio"
  ],
  [
    "ejercicios-059",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Jump Rope",
    "Coordinación",
    "Básico"
  ],
  [
    "ejercicios-060",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Double Unders",
    "Coordinación",
    "Intermedio"
  ],
  [
    "ejercicios-061",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Triple Unders",
    "Coordinación",
    "Avanzado"
  ],
  [
    "ejercicios-062",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Broad Jump",
    "Pliometría",
    "Intermedio"
  ],
  [
    "ejercicios-063",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Box Jump",
    "Pliometría",
    "Intermedio"
  ],
  [
    "ejercicios-064",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Box Jump Over",
    "Pliometría",
    "Intermedio"
  ],
  [
    "ejercicios-065",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Bounding",
    "Pliometría",
    "Avanzado"
  ],
  [
    "ejercicios-066",
    "Ejercicios",
    "Cardio",
    "Monoestructural",
    "Agility Ladder",
    "Coordinación",
    "Básico"
  ],
  [
    "ejercicios-067",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Burpees",
    "Full Body",
    "Básico"
  ],
  [
    "ejercicios-068",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Burpee Over Bar",
    "Full Body",
    "Intermedio"
  ],
  [
    "ejercicios-069",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Thruster",
    "Full Body",
    "Intermedio"
  ],
  [
    "ejercicios-070",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Wall Ball",
    "Full Body",
    "Intermedio"
  ],
  [
    "ejercicios-071",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Kettlebell Swing",
    "Posterior",
    "Intermedio"
  ],
  [
    "ejercicios-072",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "American Swing",
    "Posterior",
    "Intermedio"
  ],
  [
    "ejercicios-073",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Devil Press",
    "Full Body",
    "Avanzado"
  ],
  [
    "ejercicios-074",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Man Maker",
    "Full Body",
    "Avanzado"
  ],
  [
    "ejercicios-075",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Dumbbell Snatch",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-076",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Dumbbell Clean",
    "Explosivo",
    "Intermedio"
  ],
  [
    "ejercicios-077",
    "Ejercicios",
    "Funcional",
    "Full Body",
    "Sandbag Clean",
    "Full Body",
    "Intermedio"
  ],
  [
    "ejercicios-078",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Farmer Carry",
    "Carga",
    "Básico"
  ],
  [
    "ejercicios-079",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Suitcase Carry",
    "Unilateral",
    "Intermedio"
  ],
  [
    "ejercicios-080",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Overhead Carry",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "ejercicios-081",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Front Rack Carry",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "ejercicios-082",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Zercher Carry",
    "Carga",
    "Intermedio"
  ],
  [
    "ejercicios-083",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Sandbag Carry",
    "Carga",
    "Intermedio"
  ],
  [
    "ejercicios-084",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Yoke Carry",
    "Carga",
    "Avanzado"
  ],
  [
    "ejercicios-085",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Waiter Carry",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "ejercicios-086",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Single Arm Carry",
    "Unilateral",
    "Intermedio"
  ],
  [
    "ejercicios-087",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Heavy Carry",
    "Carga",
    "Avanzado"
  ],
  [
    "ejercicios-088",
    "Ejercicios",
    "Funcional",
    "Carries",
    "Offset Carry",
    "Control",
    "Avanzado"
  ],
  [
    "progresiones-001",
    "Progresiones",
    "Rope Climb",
    "Base",
    "Rope pull sentado",
    "Tracción",
    "Básico"
  ],
  [
    "progresiones-002",
    "Progresiones",
    "Rope Climb",
    "Base",
    "Rope pull de pie",
    "Tracción",
    "Básico"
  ],
  [
    "progresiones-003",
    "Progresiones",
    "Rope Climb",
    "Técnica",
    "Foot lock drill",
    "Piernas",
    "Básico"
  ],
  [
    "progresiones-004",
    "Progresiones",
    "Rope Climb",
    "Técnica",
    "J-hook practice",
    "Piernas",
    "Intermedio"
  ],
  [
    "progresiones-005",
    "Progresiones",
    "Rope Climb",
    "Isométrico",
    "Clamp hold en cuerda",
    "Agarre",
    "Intermedio"
  ],
  [
    "progresiones-006",
    "Progresiones",
    "Rope Climb",
    "Asistido",
    "Rope climb asistido",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-007",
    "Progresiones",
    "Rope Climb",
    "Progresión",
    "Rope climb parcial",
    "Altura",
    "Intermedio"
  ],
  [
    "progresiones-008",
    "Progresiones",
    "Rope Climb",
    "Excéntrico",
    "Negativas en cuerda",
    "Control",
    "Intermedio"
  ],
  [
    "progresiones-009",
    "Progresiones",
    "Rope Climb",
    "Fuerza",
    "Rope climb estricto",
    "Upper",
    "Avanzado"
  ],
  [
    "progresiones-010",
    "Progresiones",
    "Rope Climb",
    "Avanzado",
    "Rope climb sin piernas",
    "Tracción pura",
    "Avanzado"
  ],
  [
    "progresiones-011",
    "Progresiones",
    "Butterfly Pull Ups",
    "Base",
    "Beat swing",
    "Ritmo",
    "Básico"
  ],
  [
    "progresiones-012",
    "Progresiones",
    "Butterfly Pull Ups",
    "Base",
    "Kipping pull up",
    "Coordinación",
    "Intermedio"
  ],
  [
    "progresiones-013",
    "Progresiones",
    "Butterfly Pull Ups",
    "Técnica",
    "Hip drive drill",
    "Cadera",
    "Intermedio"
  ],
  [
    "progresiones-014",
    "Progresiones",
    "Butterfly Pull Ups",
    "Técnica",
    "Circular swing drill",
    "Movimiento",
    "Intermedio"
  ],
  [
    "progresiones-015",
    "Progresiones",
    "Butterfly Pull Ups",
    "Fuerza",
    "Pull up rápido",
    "Tracción",
    "Intermedio"
  ],
  [
    "progresiones-016",
    "Progresiones",
    "Butterfly Pull Ups",
    "Asistido",
    "Butterfly con banda",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-017",
    "Progresiones",
    "Butterfly Pull Ups",
    "Progresión",
    "Butterfly parcial",
    "Ciclo",
    "Intermedio"
  ],
  [
    "progresiones-018",
    "Progresiones",
    "Butterfly Pull Ups",
    "Avanzado",
    "Butterfly continuo",
    "Resistencia",
    "Avanzado"
  ],
  [
    "progresiones-019",
    "Progresiones",
    "Butterfly Pull Ups",
    "Fuerza",
    "Butterfly con lastre",
    "Tracción",
    "Avanzado"
  ],
  [
    "progresiones-020",
    "Progresiones",
    "Butterfly Pull Ups",
    "Avanzado",
    "Butterfly en sets largos",
    "Capacidad",
    "Avanzado"
  ],
  [
    "progresiones-021",
    "Progresiones",
    "Chest to Bar",
    "Base",
    "Strict pull up",
    "Fuerza",
    "Básico"
  ],
  [
    "progresiones-022",
    "Progresiones",
    "Chest to Bar",
    "Base",
    "Kipping pull up",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-023",
    "Progresiones",
    "Chest to Bar",
    "Fuerza",
    "Pull up explosivo",
    "Altura",
    "Intermedio"
  ],
  [
    "progresiones-024",
    "Progresiones",
    "Chest to Bar",
    "Técnica",
    "Chest touch drill",
    "Contacto",
    "Intermedio"
  ],
  [
    "progresiones-025",
    "Progresiones",
    "Chest to Bar",
    "Asistido",
    "Band assisted C2B",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-026",
    "Progresiones",
    "Chest to Bar",
    "Progresión",
    "C2B parcial",
    "Altura",
    "Intermedio"
  ],
  [
    "progresiones-027",
    "Progresiones",
    "Chest to Bar",
    "Fuerza",
    "C2B estricto",
    "Upper",
    "Avanzado"
  ],
  [
    "progresiones-028",
    "Progresiones",
    "Chest to Bar",
    "Avanzado",
    "C2B kipping",
    "Técnica",
    "Avanzado"
  ],
  [
    "progresiones-029",
    "Progresiones",
    "Chest to Bar",
    "Fuerza",
    "C2B con lastre",
    "Tracción",
    "Avanzado"
  ],
  [
    "progresiones-030",
    "Progresiones",
    "Chest to Bar",
    "Avanzado",
    "C2B en volumen",
    "Resistencia",
    "Avanzado"
  ],
  [
    "progresiones-031",
    "Progresiones",
    "Bar Muscle Up",
    "Base",
    "Beat swing",
    "Ritmo",
    "Básico"
  ],
  [
    "progresiones-032",
    "Progresiones",
    "Bar Muscle Up",
    "Base",
    "Kipping pull up",
    "Tracción",
    "Intermedio"
  ],
  [
    "progresiones-033",
    "Progresiones",
    "Bar Muscle Up",
    "Base",
    "Chest to bar",
    "Altura",
    "Intermedio"
  ],
  [
    "progresiones-034",
    "Progresiones",
    "Bar Muscle Up",
    "Técnica",
    "Hip to bar drill",
    "Cadera",
    "Intermedio"
  ],
  [
    "progresiones-035",
    "Progresiones",
    "Bar Muscle Up",
    "Técnica",
    "Transición baja",
    "Turnover",
    "Intermedio"
  ],
  [
    "progresiones-036",
    "Progresiones",
    "Bar Muscle Up",
    "Asistido",
    "BMU con banda",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-037",
    "Progresiones",
    "Bar Muscle Up",
    "Excéntrico",
    "BMU negativo",
    "Control",
    "Intermedio"
  ],
  [
    "progresiones-038",
    "Progresiones",
    "Bar Muscle Up",
    "Fuerza",
    "BMU estricto",
    "Upper",
    "Avanzado"
  ],
  [
    "progresiones-039",
    "Progresiones",
    "Bar Muscle Up",
    "Avanzado",
    "BMU completo",
    "Técnica",
    "Avanzado"
  ],
  [
    "progresiones-040",
    "Progresiones",
    "Bar Muscle Up",
    "Avanzado",
    "BMU en sets",
    "Capacidad",
    "Avanzado"
  ],
  [
    "progresiones-041",
    "Progresiones",
    "Ring Muscle Up",
    "Base",
    "Ring row explosivo",
    "Tracción",
    "Básico"
  ],
  [
    "progresiones-042",
    "Progresiones",
    "Ring Muscle Up",
    "Base",
    "Ring dip",
    "Empuje",
    "Intermedio"
  ],
  [
    "progresiones-043",
    "Progresiones",
    "Ring Muscle Up",
    "Técnica",
    "False grip hold",
    "Agarre",
    "Intermedio"
  ],
  [
    "progresiones-044",
    "Progresiones",
    "Ring Muscle Up",
    "Técnica",
    "Transición en anillas",
    "Turnover",
    "Intermedio"
  ],
  [
    "progresiones-045",
    "Progresiones",
    "Ring Muscle Up",
    "Asistido",
    "RMU con banda",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-046",
    "Progresiones",
    "Ring Muscle Up",
    "Excéntrico",
    "RMU negativo",
    "Control",
    "Intermedio"
  ],
  [
    "progresiones-047",
    "Progresiones",
    "Ring Muscle Up",
    "Fuerza",
    "RMU estricto",
    "Upper",
    "Avanzado"
  ],
  [
    "progresiones-048",
    "Progresiones",
    "Ring Muscle Up",
    "Avanzado",
    "RMU completo",
    "Técnica",
    "Avanzado"
  ],
  [
    "progresiones-049",
    "Progresiones",
    "Ring Muscle Up",
    "Avanzado",
    "RMU en sets",
    "Capacidad",
    "Avanzado"
  ],
  [
    "progresiones-050",
    "Progresiones",
    "Ring Muscle Up",
    "Avanzado",
    "RMU lento controlado",
    "Control",
    "Avanzado"
  ],
  [
    "progresiones-051",
    "Progresiones",
    "Handstand Walk",
    "Base",
    "Wall walk",
    "Fuerza",
    "Intermedio"
  ],
  [
    "progresiones-052",
    "Progresiones",
    "Handstand Walk",
    "Base",
    "Handstand hold pared",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "progresiones-053",
    "Progresiones",
    "Handstand Walk",
    "Técnica",
    "Shoulder taps",
    "Control",
    "Intermedio"
  ],
  [
    "progresiones-054",
    "Progresiones",
    "Handstand Walk",
    "Técnica",
    "Weight shift",
    "Equilibrio",
    "Intermedio"
  ],
  [
    "progresiones-055",
    "Progresiones",
    "Handstand Walk",
    "Técnica",
    "Handstand kick up",
    "Entrada",
    "Intermedio"
  ],
  [
    "progresiones-056",
    "Progresiones",
    "Handstand Walk",
    "Asistido",
    "Walk asistido",
    "Movimiento",
    "Intermedio"
  ],
  [
    "progresiones-057",
    "Progresiones",
    "Handstand Walk",
    "Progresión",
    "HSW parcial",
    "Distancia",
    "Intermedio"
  ],
  [
    "progresiones-058",
    "Progresiones",
    "Handstand Walk",
    "Avanzado",
    "HSW libre",
    "Control",
    "Avanzado"
  ],
  [
    "progresiones-059",
    "Progresiones",
    "Handstand Walk",
    "Avanzado",
    "HSW largo",
    "Resistencia",
    "Avanzado"
  ],
  [
    "progresiones-060",
    "Progresiones",
    "Handstand Walk",
    "Avanzado",
    "HSW con obstáculos",
    "Control",
    "Avanzado"
  ],
  [
    "progresiones-061",
    "Progresiones",
    "HSPU",
    "Base",
    "Pike push up",
    "Fuerza",
    "Básico"
  ],
  [
    "progresiones-062",
    "Progresiones",
    "HSPU",
    "Base",
    "Box pike push up",
    "Fuerza",
    "Intermedio"
  ],
  [
    "progresiones-063",
    "Progresiones",
    "HSPU",
    "Excéntrico",
    "HSPU negativo",
    "Control",
    "Intermedio"
  ],
  [
    "progresiones-064",
    "Progresiones",
    "HSPU",
    "Técnica",
    "Kipping HSPU",
    "Coordinación",
    "Intermedio"
  ],
  [
    "progresiones-065",
    "Progresiones",
    "HSPU",
    "Progresión",
    "HSPU con abmat",
    "Rango",
    "Intermedio"
  ],
  [
    "progresiones-066",
    "Progresiones",
    "HSPU",
    "Fuerza",
    "HSPU estricto",
    "Upper",
    "Avanzado"
  ],
  [
    "progresiones-067",
    "Progresiones",
    "HSPU",
    "Avanzado",
    "Deficit HSPU",
    "Rango",
    "Avanzado"
  ],
  [
    "progresiones-068",
    "Progresiones",
    "HSPU",
    "Avanzado",
    "HSPU en sets",
    "Capacidad",
    "Avanzado"
  ],
  [
    "progresiones-069",
    "Progresiones",
    "HSPU",
    "Control",
    "HSPU tempo",
    "Tiempo bajo tensión",
    "Avanzado"
  ],
  [
    "progresiones-070",
    "Progresiones",
    "HSPU",
    "Avanzado",
    "Strict deficit HSPU",
    "Fuerza",
    "Avanzado"
  ],
  [
    "progresiones-071",
    "Progresiones",
    "Split Jerk",
    "Base",
    "Press estricto",
    "Fuerza",
    "Básico"
  ],
  [
    "progresiones-072",
    "Progresiones",
    "Split Jerk",
    "Base",
    "Push press",
    "Potencia",
    "Intermedio"
  ],
  [
    "progresiones-073",
    "Progresiones",
    "Split Jerk",
    "Base",
    "Push jerk",
    "Técnica",
    "Intermedio"
  ],
  [
    "progresiones-074",
    "Progresiones",
    "Split Jerk",
    "Técnica",
    "Footwork drill",
    "Pies",
    "Intermedio"
  ],
  [
    "progresiones-075",
    "Progresiones",
    "Split Jerk",
    "Técnica",
    "Split position hold",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "progresiones-076",
    "Progresiones",
    "Split Jerk",
    "Técnica",
    "Jerk dip drive",
    "Potencia",
    "Intermedio"
  ],
  [
    "progresiones-077",
    "Progresiones",
    "Split Jerk",
    "Control",
    "Split jerk con pausa",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "progresiones-078",
    "Progresiones",
    "Split Jerk",
    "Fuerza",
    "Split jerk pesado",
    "Carga",
    "Avanzado"
  ],
  [
    "progresiones-079",
    "Progresiones",
    "Split Jerk",
    "Avanzado",
    "Split jerk complejo",
    "Coordinación",
    "Avanzado"
  ],
  [
    "progresiones-080",
    "Progresiones",
    "Split Jerk",
    "Avanzado",
    "Split jerk en sets",
    "Capacidad",
    "Avanzado"
  ],
  [
    "movilidad-001",
    "Movilidad",
    "Tobillo",
    "Movilidad",
    "Ankle Dorsiflexion",
    "Rango",
    "Básico"
  ],
  [
    "movilidad-002",
    "Movilidad",
    "Tobillo",
    "Movilidad",
    "Knee to Wall",
    "Funcional",
    "Básico"
  ],
  [
    "movilidad-003",
    "Movilidad",
    "Tobillo",
    "Movilidad",
    "Banded Ankle Stretch",
    "Asistido",
    "Intermedio"
  ],
  [
    "movilidad-004",
    "Movilidad",
    "Tobillo",
    "Flexibilidad",
    "Calf Stretch",
    "Gastrocnemio",
    "Básico"
  ],
  [
    "movilidad-005",
    "Movilidad",
    "Tobillo",
    "Flexibilidad",
    "Soleus Stretch",
    "Sóleo",
    "Básico"
  ],
  [
    "movilidad-006",
    "Movilidad",
    "Tobillo",
    "Activación",
    "Tibialis Stretch",
    "Anterior",
    "Intermedio"
  ],
  [
    "movilidad-007",
    "Movilidad",
    "Tobillo",
    "Control",
    "Ankle Circles",
    "Propiocepción",
    "Básico"
  ],
  [
    "movilidad-008",
    "Movilidad",
    "Tobillo",
    "Activación",
    "Heel Walk",
    "Anterior",
    "Intermedio"
  ],
  [
    "movilidad-009",
    "Movilidad",
    "Tobillo",
    "Activación",
    "Toe Walk",
    "Posterior",
    "Intermedio"
  ],
  [
    "movilidad-010",
    "Movilidad",
    "Tobillo",
    "Movilidad",
    "Deep Squat Rock",
    "Integrado",
    "Intermedio"
  ],
  [
    "movilidad-011",
    "Movilidad",
    "Tobillo",
    "Control",
    "Single Leg Balance",
    "Estabilidad",
    "Básico"
  ],
  [
    "movilidad-012",
    "Movilidad",
    "Tobillo",
    "Pliométrico",
    "Ankle Hops",
    "Reactividad",
    "Avanzado"
  ],
  [
    "movilidad-013",
    "Movilidad",
    "Rodilla",
    "Activación",
    "Spanish Squat",
    "Isométrico",
    "Intermedio"
  ],
  [
    "movilidad-014",
    "Movilidad",
    "Rodilla",
    "Activación",
    "Terminal Knee Extension",
    "VMO",
    "Básico"
  ],
  [
    "movilidad-015",
    "Movilidad",
    "Rodilla",
    "Movilidad",
    "Reverse Nordic",
    "Cuádriceps",
    "Intermedio"
  ],
  [
    "movilidad-016",
    "Movilidad",
    "Rodilla",
    "Control",
    "Peterson Step",
    "VMO",
    "Intermedio"
  ],
  [
    "movilidad-017",
    "Movilidad",
    "Rodilla",
    "Isométrico",
    "Wall Sit",
    "Cuádriceps",
    "Básico"
  ],
  [
    "movilidad-018",
    "Movilidad",
    "Rodilla",
    "Control",
    "Step Down",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "movilidad-019",
    "Movilidad",
    "Rodilla",
    "Control",
    "Knee CARs",
    "Movilidad",
    "Básico"
  ],
  [
    "movilidad-020",
    "Movilidad",
    "Rodilla",
    "Movilidad",
    "Dynamic Lunges",
    "Dinámico",
    "Básico"
  ],
  [
    "movilidad-021",
    "Movilidad",
    "Rodilla",
    "Flexibilidad",
    "Quad Stretch",
    "Cuádriceps",
    "Básico"
  ],
  [
    "movilidad-022",
    "Movilidad",
    "Rodilla",
    "Estabilidad",
    "Split Squat Iso",
    "Unilateral",
    "Intermedio"
  ],
  [
    "movilidad-023",
    "Movilidad",
    "Rodilla",
    "Control",
    "Jump Stick",
    "Aterrizaje",
    "Avanzado"
  ],
  [
    "movilidad-024",
    "Movilidad",
    "Rodilla",
    "Movilidad",
    "Heel Elevated Squat",
    "Control",
    "Intermedio"
  ],
  [
    "movilidad-025",
    "Movilidad",
    "Cadera",
    "Movilidad",
    "90/90",
    "Rotación",
    "Básico"
  ],
  [
    "movilidad-026",
    "Movilidad",
    "Cadera",
    "Control",
    "Hip CARs",
    "Movilidad",
    "Intermedio"
  ],
  [
    "movilidad-027",
    "Movilidad",
    "Cadera",
    "Flexibilidad",
    "Couch Stretch",
    "Flexor",
    "Básico"
  ],
  [
    "movilidad-028",
    "Movilidad",
    "Cadera",
    "Flexibilidad",
    "Pigeon Stretch",
    "Glúteo",
    "Básico"
  ],
  [
    "movilidad-029",
    "Movilidad",
    "Cadera",
    "Flexibilidad",
    "Frog Stretch",
    "Aductores",
    "Intermedio"
  ],
  [
    "movilidad-030",
    "Movilidad",
    "Cadera",
    "Movilidad",
    "Cossack Squat",
    "Lateral",
    "Intermedio"
  ],
  [
    "movilidad-031",
    "Movilidad",
    "Cadera",
    "Movilidad",
    "Deep Squat Hold",
    "Integrado",
    "Básico"
  ],
  [
    "movilidad-032",
    "Movilidad",
    "Cadera",
    "Movilidad",
    "Adductor Rockback",
    "Aductor",
    "Intermedio"
  ],
  [
    "movilidad-033",
    "Movilidad",
    "Cadera",
    "Flexibilidad",
    "Hip Flexor Stretch",
    "Flexor",
    "Básico"
  ],
  [
    "movilidad-034",
    "Movilidad",
    "Cadera",
    "Flexibilidad",
    "Glute Stretch",
    "Glúteo",
    "Básico"
  ],
  [
    "movilidad-035",
    "Movilidad",
    "Cadera",
    "Control",
    "Hip Airplane",
    "Estabilidad",
    "Avanzado"
  ],
  [
    "movilidad-036",
    "Movilidad",
    "Cadera",
    "Activación",
    "Band Walk",
    "Glúteo medio",
    "Intermedio"
  ],
  [
    "movilidad-037",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Cat Cow",
    "Columna",
    "Básico"
  ],
  [
    "movilidad-038",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Jefferson Curl",
    "Flexión",
    "Avanzado"
  ],
  [
    "movilidad-039",
    "Movilidad",
    "Espalda",
    "Flexibilidad",
    "Child Pose",
    "Descarga",
    "Básico"
  ],
  [
    "movilidad-040",
    "Movilidad",
    "Espalda",
    "Flexibilidad",
    "Cobra Stretch",
    "Extensión",
    "Básico"
  ],
  [
    "movilidad-041",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Lumbar Rotation",
    "Rotación",
    "Básico"
  ],
  [
    "movilidad-042",
    "Movilidad",
    "Espalda",
    "Control",
    "Segmental Roll",
    "Columna",
    "Intermedio"
  ],
  [
    "movilidad-043",
    "Movilidad",
    "Espalda",
    "Activación",
    "Superman Hold",
    "Extensión",
    "Intermedio"
  ],
  [
    "movilidad-044",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Back Bridge",
    "Extensión",
    "Avanzado"
  ],
  [
    "movilidad-045",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Spine Flexion",
    "Flexión",
    "Básico"
  ],
  [
    "movilidad-046",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Spine Extension",
    "Extensión",
    "Básico"
  ],
  [
    "movilidad-047",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Thoracic Rotation",
    "Torácica",
    "Intermedio"
  ],
  [
    "movilidad-048",
    "Movilidad",
    "Espalda",
    "Movilidad",
    "Open Books",
    "Rotación",
    "Intermedio"
  ],
  [
    "movilidad-049",
    "Movilidad",
    "Cintura Escapular",
    "Control",
    "Shoulder CARs",
    "Movilidad",
    "Intermedio"
  ],
  [
    "movilidad-050",
    "Movilidad",
    "Cintura Escapular",
    "Activación",
    "Scap Push Up",
    "Escápula",
    "Básico"
  ],
  [
    "movilidad-051",
    "Movilidad",
    "Cintura Escapular",
    "Activación",
    "Scap Pull Up",
    "Escápula",
    "Intermedio"
  ],
  [
    "movilidad-052",
    "Movilidad",
    "Cintura Escapular",
    "Movilidad",
    "Dead Hang",
    "Descompresión",
    "Básico"
  ],
  [
    "movilidad-053",
    "Movilidad",
    "Cintura Escapular",
    "Movilidad",
    "PVC Pass Through",
    "Hombro",
    "Básico"
  ],
  [
    "movilidad-054",
    "Movilidad",
    "Cintura Escapular",
    "Control",
    "Wall Slides",
    "Escápula",
    "Intermedio"
  ],
  [
    "movilidad-055",
    "Movilidad",
    "Cintura Escapular",
    "Activación",
    "YTWs",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "movilidad-056",
    "Movilidad",
    "Cintura Escapular",
    "Estabilidad",
    "Overhead Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "movilidad-057",
    "Movilidad",
    "Cintura Escapular",
    "Movilidad",
    "Shoulder Dislocates",
    "Hombro",
    "Básico"
  ],
  [
    "movilidad-058",
    "Movilidad",
    "Cintura Escapular",
    "Control",
    "Active Hang",
    "Escápula",
    "Intermedio"
  ],
  [
    "movilidad-059",
    "Movilidad",
    "Cintura Escapular",
    "Movilidad",
    "Front Rack Stretch",
    "Rack",
    "Intermedio"
  ],
  [
    "movilidad-060",
    "Movilidad",
    "Cintura Escapular",
    "Activación",
    "Band Pull Apart",
    "Escápula",
    "Básico"
  ],
  [
    "movilidad-061",
    "Movilidad",
    "Codo",
    "Control",
    "Elbow CARs",
    "Movilidad",
    "Básico"
  ],
  [
    "movilidad-062",
    "Movilidad",
    "Codo",
    "Flexibilidad",
    "Bicep Stretch",
    "Bíceps",
    "Básico"
  ],
  [
    "movilidad-063",
    "Movilidad",
    "Codo",
    "Flexibilidad",
    "Tricep Stretch",
    "Tríceps",
    "Básico"
  ],
  [
    "movilidad-064",
    "Movilidad",
    "Codo",
    "Activación",
    "Band Extension",
    "Extensión",
    "Intermedio"
  ],
  [
    "movilidad-065",
    "Movilidad",
    "Codo",
    "Activación",
    "Band Flexion",
    "Flexión",
    "Intermedio"
  ],
  [
    "movilidad-066",
    "Movilidad",
    "Codo",
    "Estabilidad",
    "Isometric Curl Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "movilidad-067",
    "Movilidad",
    "Codo",
    "Estabilidad",
    "Isometric Extension Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "movilidad-068",
    "Movilidad",
    "Codo",
    "Estabilidad",
    "Plank Hold Grip",
    "Control",
    "Básico"
  ],
  [
    "movilidad-069",
    "Movilidad",
    "Codo",
    "Carga",
    "Farmer Carry",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "movilidad-070",
    "Movilidad",
    "Codo",
    "Carga",
    "Suitcase Carry",
    "Unilateral",
    "Intermedio"
  ],
  [
    "movilidad-071",
    "Movilidad",
    "Codo",
    "Estabilidad",
    "Ring Support",
    "Control",
    "Avanzado"
  ],
  [
    "movilidad-072",
    "Movilidad",
    "Codo",
    "Estabilidad",
    "Bottoms Up Hold",
    "Control",
    "Avanzado"
  ],
  [
    "movilidad-073",
    "Movilidad",
    "Muñeca",
    "Control",
    "Wrist Circles",
    "Movilidad",
    "Básico"
  ],
  [
    "movilidad-074",
    "Movilidad",
    "Muñeca",
    "Flexibilidad",
    "Wrist Extension Stretch",
    "Extensión",
    "Básico"
  ],
  [
    "movilidad-075",
    "Movilidad",
    "Muñeca",
    "Flexibilidad",
    "Wrist Flexion Stretch",
    "Flexión",
    "Básico"
  ],
  [
    "movilidad-076",
    "Movilidad",
    "Muñeca",
    "Movilidad",
    "Loaded Wrist Rocks",
    "Carga",
    "Intermedio"
  ],
  [
    "movilidad-077",
    "Movilidad",
    "Muñeca",
    "Estabilidad",
    "Fingertip Push Up",
    "Fuerza",
    "Avanzado"
  ],
  [
    "movilidad-078",
    "Movilidad",
    "Muñeca",
    "Estabilidad",
    "Quadruped Hold",
    "Control",
    "Básico"
  ],
  [
    "movilidad-079",
    "Movilidad",
    "Muñeca",
    "Estabilidad",
    "Wall Lean",
    "Carga",
    "Intermedio"
  ],
  [
    "movilidad-080",
    "Movilidad",
    "Muñeca",
    "Estabilidad",
    "DB Grip Hold",
    "Agarre",
    "Intermedio"
  ],
  [
    "movilidad-081",
    "Movilidad",
    "Muñeca",
    "Estabilidad",
    "Plate Pinch",
    "Agarre",
    "Intermedio"
  ],
  [
    "movilidad-082",
    "Movilidad",
    "Muñeca",
    "Control",
    "Single Arm Plank",
    "Anti rotación",
    "Avanzado"
  ],
  [
    "movilidad-083",
    "Movilidad",
    "Muñeca",
    "Control",
    "Bear Crawl",
    "Dinámico",
    "Intermedio"
  ],
  [
    "movilidad-084",
    "Movilidad",
    "Muñeca",
    "Estabilidad",
    "Handstand Hold",
    "Carga",
    "Avanzado"
  ],
  [
    "core-001",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Single Leg Balance",
    "Propiocepción",
    "Básico"
  ],
  [
    "core-002",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Balance ojos cerrados",
    "Control",
    "Intermedio"
  ],
  [
    "core-003",
    "Core",
    "Tobillo",
    "Anti rotación",
    "Single Leg RDL Hold",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "core-004",
    "Core",
    "Tobillo",
    "Anti extensión",
    "Farmer Carry puntas",
    "Carga",
    "Intermedio"
  ],
  [
    "core-005",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Toe Walk Hold",
    "Activación",
    "Básico"
  ],
  [
    "core-006",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Heel Walk Hold",
    "Activación",
    "Básico"
  ],
  [
    "core-007",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Ankle Stability Hop",
    "Pliométrico",
    "Intermedio"
  ],
  [
    "core-008",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Bosu Balance",
    "Inestable",
    "Intermedio"
  ],
  [
    "core-009",
    "Core",
    "Tobillo",
    "Estabilidad",
    "Isometric Calf Hold",
    "Isométrico",
    "Básico"
  ],
  [
    "core-010",
    "Core",
    "Tobillo",
    "Control",
    "Single Leg Jump Stick",
    "Estabilidad",
    "Avanzado"
  ],
  [
    "core-011",
    "Core",
    "Rodilla",
    "Anti extensión",
    "Split Squat Hold",
    "Isométrico",
    "Básico"
  ],
  [
    "core-012",
    "Core",
    "Rodilla",
    "Anti extensión",
    "Wall Sit",
    "Isométrico",
    "Básico"
  ],
  [
    "core-013",
    "Core",
    "Rodilla",
    "Anti rotación",
    "Step Down Control",
    "Control",
    "Intermedio"
  ],
  [
    "core-014",
    "Core",
    "Rodilla",
    "Control",
    "Peterson Step Hold",
    "VMO",
    "Intermedio"
  ],
  [
    "core-015",
    "Core",
    "Rodilla",
    "Estabilidad",
    "Lunge Hold",
    "Isométrico",
    "Básico"
  ],
  [
    "core-016",
    "Core",
    "Rodilla",
    "Estabilidad",
    "Single Leg Squat Hold",
    "Control",
    "Intermedio"
  ],
  [
    "core-017",
    "Core",
    "Rodilla",
    "Anti extensión",
    "Tempo Squat Hold",
    "Control",
    "Intermedio"
  ],
  [
    "core-018",
    "Core",
    "Rodilla",
    "Estabilidad",
    "Isometric Lunge Front",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-019",
    "Core",
    "Rodilla",
    "Control",
    "Heel Elevated Squat Hold",
    "Cuádriceps",
    "Intermedio"
  ],
  [
    "core-020",
    "Core",
    "Rodilla",
    "Control",
    "Jump Landing Stick",
    "Pliométrico",
    "Avanzado"
  ],
  [
    "core-021",
    "Core",
    "Cadera",
    "Anti extensión",
    "Glute Bridge Hold",
    "Glúteo",
    "Básico"
  ],
  [
    "core-022",
    "Core",
    "Cadera",
    "Anti rotación",
    "Single Leg Glute Bridge",
    "Unilateral",
    "Intermedio"
  ],
  [
    "core-023",
    "Core",
    "Cadera",
    "Anti rotación",
    "Hip Airplane",
    "Control",
    "Avanzado"
  ],
  [
    "core-024",
    "Core",
    "Cadera",
    "Estabilidad",
    "Cossack Hold",
    "Lateral",
    "Intermedio"
  ],
  [
    "core-025",
    "Core",
    "Cadera",
    "Estabilidad",
    "Clamshell Hold",
    "Abductores",
    "Básico"
  ],
  [
    "core-026",
    "Core",
    "Cadera",
    "Estabilidad",
    "Fire Hydrant Hold",
    "Glúteo medio",
    "Intermedio"
  ],
  [
    "core-027",
    "Core",
    "Cadera",
    "Estabilidad",
    "Lateral Band Walk Hold",
    "Abductores",
    "Intermedio"
  ],
  [
    "core-028",
    "Core",
    "Cadera",
    "Estabilidad",
    "Split Squat Iso",
    "Unilateral",
    "Intermedio"
  ],
  [
    "core-029",
    "Core",
    "Cadera",
    "Anti rotación",
    "Single Leg RDL",
    "Hinge",
    "Intermedio"
  ],
  [
    "core-030",
    "Core",
    "Cadera",
    "Anti extensión",
    "Hip Thrust Hold",
    "Glúteo",
    "Básico"
  ],
  [
    "core-031",
    "Core",
    "Cadena anterior",
    "Anti extensión",
    "Plank",
    "Estático",
    "Básico"
  ],
  [
    "core-032",
    "Core",
    "Cadena anterior",
    "Anti extensión",
    "Hollow Hold",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-033",
    "Core",
    "Cadena anterior",
    "Anti extensión",
    "Dead Bug",
    "Control",
    "Básico"
  ],
  [
    "core-034",
    "Core",
    "Cadena anterior",
    "Flexión",
    "Sit Up",
    "Dinámico",
    "Básico"
  ],
  [
    "core-035",
    "Core",
    "Cadena anterior",
    "Flexión",
    "V-Up",
    "Dinámico",
    "Intermedio"
  ],
  [
    "core-036",
    "Core",
    "Cadena anterior",
    "Flexión",
    "Toes to Bar",
    "Avanzado",
    "Avanzado"
  ],
  [
    "core-037",
    "Core",
    "Cadena anterior",
    "Flexión",
    "Hanging Knee Raise",
    "Inferior",
    "Intermedio"
  ],
  [
    "core-038",
    "Core",
    "Cadena anterior",
    "Anti rotación",
    "Plank Reach",
    "Control",
    "Intermedio"
  ],
  [
    "core-039",
    "Core",
    "Cadena anterior",
    "Anti extensión",
    "Ab Wheel",
    "Avanzado",
    "Avanzado"
  ],
  [
    "core-040",
    "Core",
    "Cadena anterior",
    "Anti extensión",
    "Weighted Plank",
    "Carga",
    "Intermedio"
  ],
  [
    "core-041",
    "Core",
    "Cadena posterior",
    "Extensión",
    "Superman Hold",
    "Isométrico",
    "Básico"
  ],
  [
    "core-042",
    "Core",
    "Cadena posterior",
    "Extensión",
    "Back Extension",
    "Lumbar",
    "Básico"
  ],
  [
    "core-043",
    "Core",
    "Cadena posterior",
    "Anti rotación",
    "Bird Dog",
    "Control",
    "Básico"
  ],
  [
    "core-044",
    "Core",
    "Cadena posterior",
    "Anti extensión",
    "Reverse Plank",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-045",
    "Core",
    "Cadena posterior",
    "Extensión",
    "Hip Extension Hold",
    "Glúteo",
    "Básico"
  ],
  [
    "core-046",
    "Core",
    "Cadena posterior",
    "Anti extensión",
    "Good Morning Hold",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-047",
    "Core",
    "Cadena posterior",
    "Extensión",
    "Back Bridge",
    "Avanzado",
    "Avanzado"
  ],
  [
    "core-048",
    "Core",
    "Cadena posterior",
    "Anti rotación",
    "Glute Bridge March",
    "Dinámico",
    "Intermedio"
  ],
  [
    "core-049",
    "Core",
    "Cadena posterior",
    "Extensión",
    "Prone Hold",
    "Isométrico",
    "Básico"
  ],
  [
    "core-050",
    "Core",
    "Cadena posterior",
    "Estabilidad",
    "Nordic Hold",
    "Isométrico",
    "Avanzado"
  ],
  [
    "core-051",
    "Core",
    "Escapular",
    "Anti rotación",
    "Plank Shoulder Tap",
    "Control",
    "Intermedio"
  ],
  [
    "core-052",
    "Core",
    "Escapular",
    "Anti rotación",
    "Bear Crawl",
    "Dinámico",
    "Intermedio"
  ],
  [
    "core-053",
    "Core",
    "Escapular",
    "Estabilidad",
    "Scap Hold Hang",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-054",
    "Core",
    "Escapular",
    "Estabilidad",
    "Ring Support Hold",
    "Avanzado",
    "Avanzado"
  ],
  [
    "core-055",
    "Core",
    "Escapular",
    "Anti extensión",
    "Push Up Hold",
    "Isométrico",
    "Básico"
  ],
  [
    "core-056",
    "Core",
    "Escapular",
    "Control",
    "Scap Push Up",
    "Activación",
    "Básico"
  ],
  [
    "core-057",
    "Core",
    "Escapular",
    "Control",
    "Wall Slide Hold",
    "Estabilidad",
    "Intermedio"
  ],
  [
    "core-058",
    "Core",
    "Escapular",
    "Anti extensión",
    "Overhead Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "core-059",
    "Core",
    "Escapular",
    "Anti extensión",
    "Front Rack Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "core-060",
    "Core",
    "Escapular",
    "Estabilidad",
    "YTW Hold",
    "Activación",
    "Intermedio"
  ],
  [
    "core-061",
    "Core",
    "Hombros",
    "Anti extensión",
    "Handstand Hold",
    "Isométrico",
    "Avanzado"
  ],
  [
    "core-062",
    "Core",
    "Hombros",
    "Anti extensión",
    "Wall Walk Hold",
    "Isométrico",
    "Avanzado"
  ],
  [
    "core-063",
    "Core",
    "Hombros",
    "Anti rotación",
    "Shoulder Tap HS",
    "Control",
    "Avanzado"
  ],
  [
    "core-064",
    "Core",
    "Hombros",
    "Anti extensión",
    "Pike Hold",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-065",
    "Core",
    "Hombros",
    "Anti extensión",
    "DB Overhead Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "core-066",
    "Core",
    "Hombros",
    "Estabilidad",
    "KB Bottom Up Hold",
    "Control",
    "Avanzado"
  ],
  [
    "core-067",
    "Core",
    "Hombros",
    "Anti extensión",
    "Plate Hold Overhead",
    "Carga",
    "Intermedio"
  ],
  [
    "core-068",
    "Core",
    "Hombros",
    "Anti rotación",
    "HS Weight Shift",
    "Control",
    "Avanzado"
  ],
  [
    "core-069",
    "Core",
    "Hombros",
    "Anti extensión",
    "Wall Facing Hold",
    "Isométrico",
    "Avanzado"
  ],
  [
    "core-070",
    "Core",
    "Hombros",
    "Anti rotación",
    "Single Arm OH Hold",
    "Unilateral",
    "Intermedio"
  ],
  [
    "core-071",
    "Core",
    "Codos",
    "Anti rotación",
    "Farmer Carry",
    "Carga",
    "Básico"
  ],
  [
    "core-072",
    "Core",
    "Codos",
    "Anti rotación",
    "Suitcase Carry",
    "Unilateral",
    "Intermedio"
  ],
  [
    "core-073",
    "Core",
    "Codos",
    "Estabilidad",
    "Bottoms Up Hold",
    "Control",
    "Avanzado"
  ],
  [
    "core-074",
    "Core",
    "Codos",
    "Anti extensión",
    "Front Rack Carry",
    "Carga",
    "Intermedio"
  ],
  [
    "core-075",
    "Core",
    "Codos",
    "Anti extensión",
    "Overhead Carry",
    "Carga",
    "Intermedio"
  ],
  [
    "core-076",
    "Core",
    "Codos",
    "Estabilidad",
    "Isometric Curl Hold",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-077",
    "Core",
    "Codos",
    "Estabilidad",
    "Isometric Extension Hold",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-078",
    "Core",
    "Codos",
    "Estabilidad",
    "Ring Support",
    "Avanzado",
    "Avanzado"
  ],
  [
    "core-079",
    "Core",
    "Codos",
    "Estabilidad",
    "Plank Grip Hold",
    "Control",
    "Básico"
  ],
  [
    "core-080",
    "Core",
    "Codos",
    "Control",
    "Band Hold Extension",
    "Activación",
    "Básico"
  ],
  [
    "core-081",
    "Core",
    "Muñecas",
    "Anti extensión",
    "Plank Hold",
    "Carga",
    "Básico"
  ],
  [
    "core-082",
    "Core",
    "Muñecas",
    "Anti rotación",
    "Bear Crawl",
    "Dinámico",
    "Intermedio"
  ],
  [
    "core-083",
    "Core",
    "Muñecas",
    "Anti extensión",
    "Handstand Hold",
    "Isométrico",
    "Avanzado"
  ],
  [
    "core-084",
    "Core",
    "Muñecas",
    "Estabilidad",
    "Wrist Stability Hold",
    "Control",
    "Intermedio"
  ],
  [
    "core-085",
    "Core",
    "Muñecas",
    "Estabilidad",
    "Fingertip Plank",
    "Avanzado",
    "Avanzado"
  ],
  [
    "core-086",
    "Core",
    "Muñecas",
    "Estabilidad",
    "Quadruped Hold",
    "Control",
    "Básico"
  ],
  [
    "core-087",
    "Core",
    "Muñecas",
    "Anti extensión",
    "Wall Lean Hold",
    "Isométrico",
    "Intermedio"
  ],
  [
    "core-088",
    "Core",
    "Muñecas",
    "Estabilidad",
    "DB Grip Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "core-089",
    "Core",
    "Muñecas",
    "Estabilidad",
    "Plate Pinch Hold",
    "Carga",
    "Intermedio"
  ],
  [
    "core-090",
    "Core",
    "Muñecas",
    "Anti rotación",
    "Single Arm Plank",
    "Control",
    "Avanzado"
  ]
];

function buildDescription(exercise) {
  const parts = [exercise.section, exercise.category, exercise.subcategory, exercise.movement_type, exercise.difficulty]
    .filter(Boolean);
  return parts.join(" / ");
}

const exerciseLibrary = EXERCISE_LIBRARY_ROWS.map((row) => {
  const exercise = Object.fromEntries(EXERCISE_LIBRARY_COLUMNS.map((column, index) => [column, row[index] || ""]));
  return {
    ...exercise,
    source: "glosario",
    video_url: "",
    description: buildDescription(exercise),
  };
});

const exerciseSections = [...new Set(exerciseLibrary.map((exercise) => exercise.section))].map((section) => ({
  name: section,
  total: exerciseLibrary.filter((exercise) => exercise.section === section).length,
}));

module.exports = {
  exerciseLibrary,
  exerciseSections,
};

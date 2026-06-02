(function attachPulpoWorkoutFlow(global) {
  const META_PREFIX = "[[pb-meta:";
  const DEFAULT_BLOCK_LABEL = "Trabajo principal";

  function cleanMetaValue(value) {
    return String(value ?? "")
      .replaceAll("|", " ")
      .replaceAll("]", "")
      .trim();
  }

  function encodeExercisePrescription(input = {}) {
    const instruction = String(input.instruction ?? input.prescription ?? "").trim();
    const blockLabel = cleanMetaValue(input.blockLabel);
    const restLabel = cleanMetaValue(input.restLabel);
    const tempoLabel = cleanMetaValue(input.tempoLabel);
    const metaParts = [];

    if (blockLabel) metaParts.push(`block=${blockLabel}`);
    if (restLabel) metaParts.push(`rest=${restLabel}`);
    if (tempoLabel) metaParts.push(`tempo=${tempoLabel}`);

    if (!metaParts.length) return instruction;
    return `${META_PREFIX}${metaParts.join("|")}]]${instruction ? ` ${instruction}` : ""}`;
  }

  function decodeExercisePrescription(rawValue) {
    const raw = String(rawValue ?? "").trim();
    const decoded = {
      raw,
      instruction: raw,
      blockLabel: "",
      restLabel: "",
      tempoLabel: "",
    };

    if (!raw.startsWith(META_PREFIX)) return decoded;
    const closingIndex = raw.indexOf("]]");
    if (closingIndex === -1) return decoded;

    const metaString = raw.slice(META_PREFIX.length, closingIndex);
    const instruction = raw.slice(closingIndex + 2).trim();

    metaString.split("|").forEach((entry) => {
      const [key, ...rest] = entry.split("=");
      const value = rest.join("=").trim();
      if (!value) return;
      if (key === "block") decoded.blockLabel = value;
      if (key === "rest") decoded.restLabel = value;
      if (key === "tempo") decoded.tempoLabel = value;
    });

    decoded.instruction = instruction;
    return decoded;
  }

  function extendExercise(exercise = {}) {
    const decoded = decodeExercisePrescription(exercise.prescription || "");
    return {
      ...exercise,
      block_label: exercise.block_label || decoded.blockLabel || "",
      rest_label: exercise.rest_label || decoded.restLabel || "",
      tempo_label: exercise.tempo_label || decoded.tempoLabel || "",
      display_prescription: decoded.instruction || "",
    };
  }

  function groupExercisesByBlock(exercises = []) {
    const grouped = [];
    const map = new Map();

    exercises.forEach((item) => {
      const exercise = extendExercise(item);
      const blockLabel = cleanMetaValue(exercise.block_label) || DEFAULT_BLOCK_LABEL;

      if (!map.has(blockLabel)) {
        const block = { label: blockLabel, items: [] };
        map.set(blockLabel, block);
        grouped.push(block);
      }

      map.get(blockLabel).items.push(exercise);
    });

    return grouped;
  }

  function getDefaultBlockLabel() {
    return DEFAULT_BLOCK_LABEL;
  }

  global.PulpoWorkoutFlow = {
    DEFAULT_BLOCK_LABEL,
    encodeExercisePrescription,
    decodeExercisePrescription,
    extendExercise,
    groupExercisesByBlock,
    getDefaultBlockLabel,
  };
})(window);

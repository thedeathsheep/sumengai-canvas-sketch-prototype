const supportedScenarios = new Set([
  "save-asset-fail",
  "save-node-fail",
  "element-library-fail",
  "image-load-fail",
]);

export function readPrototypeScenario(search = "") {
  const scenario = new URLSearchParams(search).get("scenario");
  return supportedScenarios.has(scenario) ? scenario : null;
}

export function createOneShotScenario(scenario) {
  const consumed = new Set();

  return {
    shouldFail(stage) {
      if (scenario !== stage || consumed.has(stage)) return false;
      consumed.add(stage);
      return true;
    },
  };
}

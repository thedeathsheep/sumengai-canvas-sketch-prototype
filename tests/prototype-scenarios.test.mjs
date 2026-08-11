import assert from "node:assert/strict";
import test from "node:test";

let scenarios = {};

try {
  scenarios = await import("../src/prototypeScenarios.js");
} catch {
  // The first red run proves deterministic prototype scenarios are absent.
}

test("reads only supported prototype scenarios from the URL", () => {
  assert.equal(
    scenarios.readPrototypeScenario?.("?scenario=save-node-fail"),
    "save-node-fail",
  );
  assert.equal(
    scenarios.readPrototypeScenario?.("?scenario=unknown"),
    null,
  );
  assert.equal(scenarios.readPrototypeScenario?.(""), null);
});

test("a matching scenario fails once and then allows retry", () => {
  const scenario = scenarios.createOneShotScenario?.("save-node-fail");
  assert.equal(scenario.shouldFail("save-asset-fail"), false);
  assert.equal(scenario.shouldFail("save-node-fail"), true);
  assert.equal(scenario.shouldFail("save-node-fail"), false);
});

test("a missing scenario never fails a stage", () => {
  const scenario = scenarios.createOneShotScenario?.(null);
  assert.equal(scenario.shouldFail("element-library-fail"), false);
  assert.equal(scenario.shouldFail("image-load-fail"), false);
});

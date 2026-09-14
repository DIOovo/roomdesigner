import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/generator/room-generator.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Execute the component's real event handlers with in-memory hooks and HTTP.
// No server, credentials, uploads, or generation provider is contacted.
function harness(props = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const requests = [];
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value) => { slots[i] = value; }];
    },
    useRef(initial) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: initial });
    },
    useCallback: (fn) => fn,
    useEffect: (fn) => { effects.push(fn); },
  };
  const modules = {
    react,
    "next/image": () => null,
    "next/link": () => null,
    "@phosphor-icons/react": {},
    "@/lib/site": {
      roomTypes: ["Living Room", "Bathroom", "Kitchen"],
      samples: [{ src: "/samples/living-before.jpg", name: "Living room" }],
      styles: [{ name: "Japandi" }, { name: "Modern" }],
    },
    "@/lib/analytics/events": { track() {}, trackEvent() {}, toAnalyticsValue: (v) => v },
    "@/lib/analytics/generator-events": {
      trackGenerateClick() {},
      trackGenerationStarted() {},
      trackGenerationCompleted() {},
      trackGenerationFailed() {},
      trackRoomTypeSelected() {},
      trackStyleSelected() {},
    },
    "@/lib/generation/design-scope": { isDesignScope: (v) => ["keep-layout", "reimagine-space"].includes(v) },
    "@/lib/http/client-response": { ApiResponseError: class extends Error {}, readApiResponse: async (r) => r },
    "@/lib/assets/input-upload-validation": { resolveRoomImageContentType: () => "image/jpeg" },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (id) => id in modules ? modules[id] : require(id),
    AbortController, DOMException, URLSearchParams,
    crypto: { randomUUID: () => "test-request" },
    window: { location: { search: "?reuse=test-history" } },
    fetch: async (url, options) => {
      if (url.endsWith("/reuse")) return { roomType: "Kitchen", style: "Modern", designScope: "reimagine-space" };
      if (url === "/api/generate") {
        requests.push(JSON.parse(options.body));
        return { error: "Test stops after capturing the request" };
      }
      throw new Error(`Unexpected test request: ${url}`);
    },
  });
  function render() { cursor = 0; effects = []; return exports.RoomGenerator(props); }
  return {
    render,
    requests,
    async restore() {
      render(); effects[2](); // Read the reuse query parameter.
      render(); effects[3](); // Restore the server response.
      await new Promise(setImmediate);
    },
  };
}

function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}

async function submit(h) {
  const button = nodes(h.render()).find((n) => n.type === "button" && n.props.onClick?.name === "handlePrimaryAction");
  assert.ok(button, "primary Generate action exists");
  button.props.onClick();
  await new Promise(setImmediate);
  return h.requests.at(-1);
}

test("default and initial-only generators keep editable room selection and payloads", async () => {
  for (const props of [{}, { initialRoomType: "Bathroom" }]) {
    const h = harness(props);
    const select = nodes(h.render()).find((n) => n.type === "select");
    assert.ok(select);
    assert.equal(select.props.value, props.initialRoomType ?? "Living Room");
    select.props.onChange({ target: { value: "Kitchen" } });
    assert.equal((await submit(h)).roomType, "Kitchen");
  }
});

test("locked Bathroom has no editable room UI and submits Bathroom after sample and style changes", async () => {
  const h = harness({ initialRoomType: "Bathroom", lockRoomType: true });
  assert.equal(nodes(h.render()).some((n) => n.type === "select"), false);
  nodes(h.render()).find((n) => n.props?.["aria-label"] === "Try Living room sample").props.onClick();
  nodes(h.render()).filter((n) => n.type === "button" && "aria-pressed" in n.props).at(-1).props.onClick();
  const payload = await submit(h);
  assert.equal(payload.roomType, "Bathroom");
  assert.equal(payload.style, "Modern");
});

test("history restores other settings but cannot override locked Bathroom; unlocked reuse is unchanged", async () => {
  for (const lockRoomType of [false, true]) {
    const h = harness({ initialRoomType: "Bathroom", lockRoomType });
    await h.restore();
    const payload = await submit(h);
    assert.equal(payload.roomType, lockRoomType ? "Bathroom" : "Kitchen");
    assert.equal(payload.style, "Modern");
    assert.equal(payload.scope, "reimagine-space");
  }
});

test("only the bathroom caller opts into the room lock", () => {
  const page = readFileSync(new URL("../app/bathroom-design/page.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<RoomGenerator initialRoomType="Bathroom" lockRoomType surface="bathroom_design" \/>/);
  assert.match(home, /<RoomGenerator \/>/);
  assert.doesNotMatch(home, /lockRoomType/);
});

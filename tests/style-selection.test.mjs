import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("style selection context is an optional client-side provider defaulting to Japandi", async () => {
  const selection = await read("components/generator/style-selection.tsx");
  assert.match(selection, /"use client"/);
  assert.match(selection, /export function StyleSelectionProvider/);
  assert.match(selection, /export function useOptionalStyleSelection/);
  assert.match(selection, /DEFAULT_STYLE = "Japandi"/);
  // Optional by design: the context default is null so consumers can fall back.
  assert.match(selection, /createContext<StyleSelection \| null>\(null\)/);
});

test("room generator reads the shared style when present and keeps local state otherwise", async () => {
  const generator = await read("components/generator/room-generator.tsx");
  assert.match(generator, /useOptionalStyleSelection/);
  assert.match(generator, /const \[internalStyle, setInternalStyle\] = useState\("Japandi"\)/);
  assert.match(generator, /const style = sharedStyle\?\.style \?\? internalStyle/);
  // The setter depends only on the provider's stable setState, so the reuse
  // effect may list it without re-running on every style change.
  assert.match(generator, /\[sharedSetStyle\]/);
  assert.match(generator, /\}, \[reuseId, lockRoomType, setStyle\]\)/);
  // Generation request payload is unchanged: same shape, same style value.
  assert.match(generator, /body: JSON\.stringify\(\{ imageUrl, roomType: room, style, scope: designScope \}\)/);
});

test("home page generator stays unwrapped and unchanged", async () => {
  const home = await read("app/page.tsx");
  assert.doesNotMatch(home, /StyleSelectionProvider/);
  assert.match(home, /<RoomGenerator \/>/);
});

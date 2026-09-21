// Run with: node --test lib/paging.test.ts (Node type-stripping)
import test from "node:test";
import assert from "node:assert/strict";
import { nextPageOffset } from "./paging.ts";

test("advancing from the loaded page is idempotent under duplicate end-reached events", () => {
  // Page at offset 0 is loaded; onEndReached fires twice before the next
  // page settles. Both calls must request offset 30, never 60.
  const PAGE_SIZE = 30;
  let requestedOffset = 0;
  const loadedOffset = 0; // server-echoed offset of the currently loaded page

  requestedOffset = nextPageOffset(loadedOffset, PAGE_SIZE);
  assert.equal(requestedOffset, 30);
  // Second duplicate event, state not yet updated — same result.
  requestedOffset = nextPageOffset(loadedOffset, PAGE_SIZE);
  assert.equal(requestedOffset, 30);
});

test("once the next page loads, advancement moves one page at a time", () => {
  assert.equal(nextPageOffset(30, 30), 60);
  assert.equal(nextPageOffset(60, 30), 90);
});

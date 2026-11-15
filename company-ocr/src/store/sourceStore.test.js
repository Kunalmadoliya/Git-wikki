import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const databasePath = path.join(
  os.tmpdir(),
  `gitwiki-source-store-${process.pid}.db`,
);
process.env.GITWIKI_DB_PATH = databasePath;

const {
  closeSourceStore,
  createSource,
  getSource,
  initSourceStore,
  transitionSource,
  updateSource,
} = await import("./sourceStore.js");

test("terminal sources reject further status transitions", () => {
  initSourceStore();
  createSource({
    sourceId: "src_terminal_test",
    repoUrl: "https://github.com/example/terminal-test",
    owner: "example",
    repo: "terminal-test",
    repoKey: "example/terminal-test",
    namespace: "example__terminal-test",
  });

  transitionSource("src_terminal_test", "READY");
  assert.equal(getSource("src_terminal_test").stage, "READY");
  assert.throws(
    () => transitionSource("src_terminal_test", "FAILED"),
    /Cannot transition terminal source/,
  );
  assert.throws(
    () => updateSource("src_terminal_test", { stage: "FAILED" }),
    /Status changes must use transitionSource/,
  );

  closeSourceStore();
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
});

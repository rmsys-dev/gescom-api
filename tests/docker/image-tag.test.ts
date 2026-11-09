import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { imageTag } from "../../scripts/docker-image.js";

describe("tag da imagem Docker", () => {
  it("junta a versão do projeto ao SHA curto", () => {
    assert.equal(imageTag("1.0.0", "a1b2c3d", null), "1.0.0-a1b2c3d");
  });

  it("acrescenta o instante quando a árvore está suja", () => {
    assert.equal(imageTag("1.0.0", "a1b2c3d", 1_731_174_300_123), "1.0.0-a1b2c3d-dirty-1731174300123");
  });

  it("recusa versão e SHA que não formam uma tag estável", () => {
    assert.throws(() => imageTag("latest", "a1b2c3d", null));
    assert.throws(() => imageTag("1.0.0", "HEAD", null));
    assert.throws(() => imageTag("1.0.0+build", "a1b2c3d", null));
  });
});

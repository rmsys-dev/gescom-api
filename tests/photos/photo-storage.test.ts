import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { AppError } from "../../src/shared/errors/app-error.js";
import {
  photoFileName,
  removePhoto,
  savePhoto,
  slugPhotoName,
} from "../../src/shared/photos/photo-storage.js";

describe("nome do arquivo da foto", () => {
  it("tira acento, espaco e limita o tamanho", () => {
    assert.equal(slugPhotoName("Lacrifilm 10ml"), "lacrifilm-10ml");
    assert.equal(slugPhotoName("Ação Única"), "acao-unica");
    assert.equal(slugPhotoName("   "), "sem-nome");
    assert.equal(slugPhotoName("a".repeat(80)).length, 60);
    assert.equal(
      photoFileName("abc", "João da Silva", "image/jpeg"),
      "abc-joao-da-silva.jpg",
    );
    assert.equal(photoFileName("abc", "Produto", "image/png"), "abc-produto.png");
    assert.equal(photoFileName("abc", "Produto", "image/webp"), "abc-produto.webp");
  });

  it("recusa tipo que nao e imagem", () => {
    assert.throws(() => photoFileName("abc", "Produto", "image/gif"), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "PHOTO_FILE_INVALID");
      return true;
    });
  });
});

describe("gravacao da foto", () => {
  it("grava e apaga o arquivo na pasta informada", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "gescom-fotos-"));
    try {
      const url = await savePhoto({
        folder: "produtos",
        id: "3f2a",
        name: "Lacrifilm 10ml",
        file: { buffer: Buffer.from("foto"), mimetype: "image/jpeg" },
        rootDir: root,
      });
      assert.equal(url, "/fotos/produtos/3f2a-lacrifilm-10ml.jpg");
      const saved = await readFile(path.join(root, "produtos", "3f2a-lacrifilm-10ml.jpg"));
      assert.equal(saved.toString(), "foto");

      await removePhoto(url, root);
      await assert.rejects(
        readFile(path.join(root, "produtos", "3f2a-lacrifilm-10ml.jpg")),
      );
      await removePhoto(url, root);
      await removePhoto("/etc/passwd", root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

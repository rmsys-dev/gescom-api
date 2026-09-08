import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { InternalServerError } from "../../src/shared/errors/app-error.js";
import {
  closePdfBrowser,
  htmlToPdf,
} from "../../src/modules/sales/print/html-to-pdf.js";

describe("htmlToPdf", () => {
  after(async () => {
    await closePdfBrowser();
  });

  it("gera um PDF A4 a partir de HTML", async () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>@page { size: A4; margin: 8mm; } body { font-family: Arial; }</style>
</head>
<body><h1>Ordem de Serviço</h1></body>
</html>`;
    try {
      const pdf = await htmlToPdf(html);
      assert.ok(pdf.length > 100);
      assert.equal(pdf.subarray(0, 5).toString("utf8"), "%PDF-");
    } catch (error) {
      if (
        error instanceof InternalServerError &&
        error.code === "PDF_ENGINE_UNAVAILABLE"
      ) {
        return;
      }
      throw error;
    }
  });
});

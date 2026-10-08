import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, prepareLogo } from "@/lib/logo";

async function pngFile(width: number, height: number) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: "#00C853" } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], "logo.png", { type: "image/png" });
}

describe("prepareLogo", () => {
  it("ignore l’absence de fichier", async () => {
    expect(await prepareLogo(null)).toEqual({ status: "none" });
    expect(await prepareLogo(new File([], "", { type: "application/octet-stream" }))).toEqual({ status: "none" });
  });

  it("refuse un format non image", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" });
    expect(await prepareLogo(file)).toEqual({ status: "invalid", message: "Format accepté : PNG, JPG ou WebP" });
  });

  it("refuse une image de plus de 5 Mo", async () => {
    const file = new File([new Uint8Array(LOGO_MAX_BYTES + 1)], "gros.png", { type: "image/png" });
    expect(await prepareLogo(file)).toEqual({ status: "invalid", message: "Image trop lourde (5 Mo max)" });
  });

  it("redimensionne à 512 px maximum et convertit en WebP", async () => {
    const result = await prepareLogo(await pngFile(2000, 1000));
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(256);
  });

  it("n’agrandit pas une petite image", async () => {
    const result = await prepareLogo(await pngFile(200, 100));
    if (result.status !== "ready") throw new Error("attendu : ready");
    expect((await sharp(result.data).metadata()).width).toBe(200);
  });

  it("signale une image illisible", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "casse.png", { type: "image/png" });
    expect(await prepareLogo(file)).toEqual({ status: "invalid", message: "Image illisible, essayez un autre fichier" });
  });
});

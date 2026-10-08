import sharp from "sharp";

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type LogoResult = { status: "none" } | { status: "invalid"; message: string } | { status: "ready"; data: Buffer };

export async function prepareLogo(file: unknown): Promise<LogoResult> {
  if (!(file instanceof File) || file.size === 0) return { status: "none" };
  if (!LOGO_TYPES.includes(file.type)) return { status: "invalid", message: "Format accepté : PNG, JPG ou WebP" };
  if (file.size > LOGO_MAX_BYTES) return { status: "invalid", message: "Image trop lourde (5 Mo max)" };
  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return { status: "ready", data };
  } catch {
    return { status: "invalid", message: "Image illisible, essayez un autre fichier" };
  }
}

/**
 * Cloudinary delivery URLs at the size they are shown: modern format (f_auto), automatic quality
 * and a width cap. Other hosts are returned unchanged. Photos uploaded from the dashboard are
 * often 2500 px originals of 1–1.5 MB; shown at 600 px they need ~60 KB.
 */
export function cld(src: string, width: number): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(/\/upload\//, `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

/** A srcset of Cloudinary widths, or undefined for other hosts (the plain src is then used). */
export function cldSrcSet(src: string, widths: readonly number[]): string | undefined {
  if (!src.includes("res.cloudinary.com")) return undefined;
  return widths.map((w) => `${cld(src, w)} ${w}w`).join(", ");
}

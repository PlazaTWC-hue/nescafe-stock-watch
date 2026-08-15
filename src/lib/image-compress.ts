/** ย่อ/บีบอัดรูปก่อนส่งให้ AI เพื่อให้อ่านเร็วและไม่ล้มเพราะไฟล์ใหญ่ */
const MAX_SIDE = 1600;
const MAX_BYTES = 3_500_000;

export async function compressImage(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.9, 0.8, 0.65, 0.5]) {
      const out = canvas.toDataURL("image/jpeg", q);
      if (out.length * 0.75 <= MAX_BYTES) return out;
    }
    return canvas.toDataURL("image/jpeg", 0.4);
  } catch {
    return dataUrl;
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("read fail"));
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("decode fail"));
    img.src = src;
  });
}

export const COMPANY_ROUND_SEAL_SRC = "/seals/company-round-seal.png";
export const PDF_COMPANY_ROUND_SEAL_SIZE_MM = 28;

let sealCachePromise = null;

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Load company round seal as base64 for jsPDF (cached).
 */
export async function loadPdfCompanyRoundSeal() {
  if (!sealCachePromise) {
    sealCachePromise = fetch(COMPANY_ROUND_SEAL_SRC)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load company round seal: ${COMPANY_ROUND_SEAL_SRC}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64);
  }
  return sealCachePromise;
}

/**
 * Draw the company round seal centered at (centerX, topY).
 * Returns the Y position below the seal.
 */
export function drawPdfCompanyRoundSeal(
  doc,
  sealBase64,
  centerX,
  topY,
  sizeMm = PDF_COMPANY_ROUND_SEAL_SIZE_MM
) {
  if (!sealBase64) return topY;

  const x = centerX - sizeMm / 2;
  doc.addImage(sealBase64, "PNG", x, topY, sizeMm, sizeMm);
  return topY + sizeMm;
}

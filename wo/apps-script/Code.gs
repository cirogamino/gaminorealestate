/**
 * WO MEDIA UPLOADER — Gamino Real Estate turnover system
 * Setup (one time, in Ciro's Google account):
 *   1. Drive: create folder "WO Media" → copy its folder ID from the URL.
 *   2. script.google.com → New project → paste this file.
 *   3. Replace FOLDER_ID below with the folder ID. Save.
 *   4. Deploy → New deployment → type: Web app → Execute as: Me →
 *      Who has access: Anyone → Deploy → authorize (one click).
 *   5. Copy the /exec URL into WO ADMIN → CLOUD AUTO-UPLOAD.
 */
const FOLDER_ID = 'PASTE_FOLDER_ID_HERE';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const bytes = Utilities.base64Decode(data.b64);
    const blob = Utilities.newBlob(bytes, 'application/octet-stream', data.name || ('file-' + Date.now()));
    DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, name: data.name }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }));
  }
}

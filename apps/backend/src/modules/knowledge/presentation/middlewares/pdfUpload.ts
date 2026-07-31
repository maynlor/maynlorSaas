import multer from "multer";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/** En memoria, no en disco: el buffer se usa una vez para extraer texto y se descarta. */
export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("Only PDF files are accepted"));
      return;
    }
    callback(null, true);
  },
});

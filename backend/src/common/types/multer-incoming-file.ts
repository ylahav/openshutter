/**
 * Multipart file from multer / Nest `@UploadedFile()`.
 * Prefer this over `Express.Multer.File`: with `@types/express@5` and TypeScript 6,
 * the Express global merge for `Multer` is not always visible and breaks `nest build`.
 */
export type MulterIncomingFile = {
	fieldname: string;
	originalname: string;
	encoding: string;
	mimetype: string;
	size: number;
	buffer?: Buffer;
	destination?: string;
	filename?: string;
	path?: string;
};

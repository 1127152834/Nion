import type { FileUIPart } from "ai";

export type PromptInputFilePartLike = FileUIPart & {
  file?: File;
};

export type PromptInputAttachmentItem = PromptInputFilePartLike & {
  id: string;
};

export type CreatePromptInputFilePartsOptions = {
  createId: () => string;
  createObjectURL?: (file: File) => string;
};

export function createPromptInputFileParts(
  files: File[] | FileList,
  options: CreatePromptInputFilePartsOptions,
): PromptInputAttachmentItem[] {
  const createObjectURL =
    options.createObjectURL ?? ((file: File) => URL.createObjectURL(file));

  return Array.from(files).map((file) => ({
    id: options.createId(),
    type: "file",
    file,
    url: createObjectURL(file),
    mediaType: file.type,
    filename: file.name,
  }));
}

export function getFilesForUpload(files: PromptInputFilePartLike[]) {
  const uploadableFiles: File[] = [];
  let missingCount = 0;

  for (const filePart of files) {
    if (filePart.file) {
      uploadableFiles.push(filePart.file);
      continue;
    }

    missingCount += 1;
  }

  return {
    files: uploadableFiles,
    missingCount,
  };
}

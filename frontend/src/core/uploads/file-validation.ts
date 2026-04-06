export type PromptInputFileErrorCode =
  | "accept"
  | "invalid_file"
  | "max_file_size"
  | "max_files";

export type PromptInputFileError = {
  code: PromptInputFileErrorCode;
  message: string;
};

export type ValidatePromptInputFilesOptions = {
  accept?: string;
  maxFileSize?: number;
};

export type ValidatePromptInputFilesResult = {
  accepted: File[];
  errors: PromptInputFileError[];
};

function matchesAcceptPattern(file: File, accept?: string) {
  if (!accept || accept.trim() === "") {
    return true;
  }

  const patterns = accept
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1);
      return file.type.startsWith(prefix);
    }

    return file.type === pattern;
  });
}

function isBlockedApplicationBundle(file: File) {
  return file.name.toLowerCase().endsWith(".app");
}

export function validatePromptInputFiles(
  files: File[] | FileList,
  options: ValidatePromptInputFilesOptions = {},
): ValidatePromptInputFilesResult {
  const maxFileSize = options.maxFileSize;
  const incomingFiles = Array.from(files);
  const errors: PromptInputFileError[] = [];
  const nonBundleFiles: File[] = [];

  for (const file of incomingFiles) {
    if (isBlockedApplicationBundle(file)) {
      continue;
    }

    nonBundleFiles.push(file);
  }

  if (nonBundleFiles.length !== incomingFiles.length) {
    errors.push({
      code: "invalid_file",
      message: "Application bundles (.app) are not supported.",
    });
  }

  const acceptedByType = nonBundleFiles.filter((file) =>
    matchesAcceptPattern(file, options.accept),
  );

  if (nonBundleFiles.length > 0 && acceptedByType.length === 0) {
    errors.push({
      code: "accept",
      message: "No files match the accepted types.",
    });
  }

  const accepted =
    typeof maxFileSize === "number"
      ? acceptedByType.filter((file) => file.size <= maxFileSize)
      : acceptedByType;

  if (
    typeof maxFileSize === "number" &&
    acceptedByType.length > 0 &&
    accepted.length === 0
  ) {
    errors.push({
      code: "max_file_size",
      message: "All files exceed the maximum size.",
    });
  }

  return { accepted, errors };
}

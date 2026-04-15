"use client";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";

import {
  asObject,
  asOptionalNumber,
  cloneConfig,
  type ConfigDraft,
  toInputValue,
} from "../shared";

const DEFAULT_MAX_FILES = 9;
const DEFAULT_MAX_FILE_SIZE_MB = 20;

function parsePositiveInteger(value: string): number | undefined {
  const parsed = asOptionalNumber(value);
  if (parsed === undefined || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

export function AttachmentsSection({
  config,
  onChange,
  disabled,
}: {
  config: ConfigDraft;
  onChange: (next: ConfigDraft) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const settingsLike = t.settings as {
    configSections?: {
      attachments?: Record<string, string>;
    };
  };
  const copy = settingsLike.configSections?.attachments ?? {};
  const sessionPolicy = asObject(config.session_policy);
  const attachments = asObject(sessionPolicy.attachments);

  const updateAttachmentSetting = (key: string, value: number | undefined) => {
    const next = cloneConfig(config);
    const nextSessionPolicy = asObject(next.session_policy);
    const nextAttachments = asObject(nextSessionPolicy.attachments);

    if (value === undefined) {
      delete nextAttachments[key];
    } else {
      nextAttachments[key] = value;
    }

    if (Object.keys(nextAttachments).length === 0) {
      delete nextSessionPolicy.attachments;
    } else {
      nextSessionPolicy.attachments = nextAttachments;
    }

    if (Object.keys(nextSessionPolicy).length === 0) {
      delete next.session_policy;
    } else {
      next.session_policy = nextSessionPolicy;
    }

    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="text-sm font-medium">{copy.title}</div>
        <div className="text-muted-foreground text-xs">{copy.subtitle}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-xs font-medium">{copy.maxFiles}</div>
          <Input
            type="number"
            placeholder={String(DEFAULT_MAX_FILES)}
            value={toInputValue(attachments.max_files)}
            onChange={(event) =>
              updateAttachmentSetting(
                "max_files",
                parsePositiveInteger(event.target.value),
              )
            }
            disabled={disabled}
          />
          <div className="text-muted-foreground text-xs">
            {(copy.currentMaxFiles ?? "Current default: {value} files").replace(
              "{value}",
              String(attachments.max_files ?? DEFAULT_MAX_FILES),
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium">{copy.maxFileSizeMb}</div>
          <Input
            type="number"
            placeholder={String(DEFAULT_MAX_FILE_SIZE_MB)}
            value={toInputValue(attachments.max_file_size_mb)}
            onChange={(event) =>
              updateAttachmentSetting(
                "max_file_size_mb",
                parsePositiveInteger(event.target.value),
              )
            }
            disabled={disabled}
          />
          <div className="text-muted-foreground text-xs">
            {(copy.currentMaxFileSizeMb ?? "Current default: {value} MB per file").replace(
              "{value}",
              String(attachments.max_file_size_mb ?? DEFAULT_MAX_FILE_SIZE_MB),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

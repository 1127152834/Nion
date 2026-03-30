"use client";

import { PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/components/workspace/settings/confirm-action-dialog";
import {
  useExportAutomationJobTemplate,
  useAutomationJob,
  useRemoveAutomationJob,
  useAutomationRuns,
  useRunAutomationJob,
  useSaveAutomationTemplate,
  useUpdateAutomationJob,
  useUploadAutomationPackageFiles,
} from "@/core/automation/hooks";
import type { AutomationJob } from "@/core/automation/types";

function readFiles(job: AutomationJob) {
  const files = job.package_manifest.files;
  return Array.isArray(files) ? files.filter((item): item is string => typeof item === "string") : [];
}

function readKnownString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function EventTaskDetailPage({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { job, isLoading, error } = useAutomationJob(jobId);
  const exportTemplate = useExportAutomationJobTemplate(jobId);
  const { runs } = useAutomationRuns();
  const runJob = useRunAutomationJob();
  const saveTemplate = useSaveAutomationTemplate();
  const updateJob = useUpdateAutomationJob();
  const uploadPackageFiles = useUploadAutomationPackageFiles();
  const removeJob = useRemoveAutomationJob();
  const [eventName, setEventName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [actionKind, setActionKind] = useState("");
  const [actionTarget, setActionTarget] = useState("");
  const [scriptPath, setScriptPath] = useState("play_sound.py");
  const [scriptContent, setScriptContent] = useState("print('hello from hook')\n");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!job) {
      return;
    }
    setEventName(readKnownString(job.trigger_spec, "event_name") ?? "");
    setPrompt(job.prompt);
    setActionKind(job.action_kind);
    setActionTarget(
      readKnownString(job.action_spec, "entrypoint") ??
        readKnownString(job.action_spec, "title") ??
        readKnownString(job.action_spec, "directory") ??
        readKnownString(job.action_spec, "sound") ??
        "",
    );
  }, [job]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading event task…</div>;
  }

  if (!job || error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
        {error instanceof Error ? error.message : "Event task not found."}
      </div>
    );
  }

  const relatedRuns = runs.filter((run) => run.job_id === job.id).slice(0, 5);

  async function handleSaveChanges() {
    if (!job) {
      return;
    }
    const nextActionSpec =
      actionKind === "script"
        ? { entrypoint: actionTarget || scriptPath }
        : actionKind === "notebook_write"
          ? { directory: actionTarget || "automation", title: job.name, body: prompt }
          : actionKind === "notify"
            ? { title: actionTarget || job.name, body: prompt }
            : actionKind === "play_sound"
              ? { sound: actionTarget || "default" }
              : {};

    await updateJob.mutateAsync({
      jobId: job.id,
      input: {
        prompt,
        trigger_spec: { event_name: eventName },
        action_kind: actionKind as
          | "agent_prompt"
          | "script"
          | "notify"
          | "play_sound"
          | "notebook_write",
        action_spec: nextActionSpec,
      },
    });
  }

  async function handleCreateScript() {
    if (!job) {
      return;
    }
    await updateJob.mutateAsync({
      jobId: job.id,
      input: {
        action_kind: "script",
        action_spec: { entrypoint: scriptPath },
        package_files: [
          {
            path: scriptPath,
            content: scriptContent,
          },
        ],
      },
    });
  }

  async function handleRemoveFile(path: string) {
    if (!job) {
      return;
    }
    await updateJob.mutateAsync({
      jobId: job.id,
      input: {
        delete_package_files: [path],
      },
    });
  }

  async function handleUpload(fileList: FileList | null) {
    if (!job) {
      return;
    }
    if (!fileList || fileList.length === 0) {
      return;
    }
    await uploadPackageFiles.mutateAsync({
      jobId: job.id,
      files: Array.from(fileList),
    });
  }

  async function handleDelete() {
    if (!job) {
      return;
    }
    await removeJob.mutateAsync(job.id);
    router.push("/workspace/automation");
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.name}</h1>
            <Badge variant="secondary">{job.state}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{job.prompt || "No prompt configured."}</p>
        </div>
        <Button onClick={() => void runJob.mutateAsync(job.id)}>
          <PlayIcon className="size-4" />
          Run now
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Trigger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-5 text-sm">
            <div>{job.trigger_kind}</div>
            <Input value={eventName} onChange={(event) => setEventName(event.target.value)} />
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-5 text-sm">
            <Select value={actionKind} onValueChange={setActionKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">notify</SelectItem>
                <SelectItem value="play_sound">play_sound</SelectItem>
                <SelectItem value="notebook_write">notebook_write</SelectItem>
                <SelectItem value="script">script</SelectItem>
                <SelectItem value="agent_prompt">agent_prompt</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={actionTarget}
              onChange={(event) => setActionTarget(event.target.value)}
              placeholder="Action target"
            />
          </CardContent>
        </Card>

        <Card className="py-0 lg:col-span-2">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Package directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 text-sm">
            <div className="font-mono text-xs text-muted-foreground">
              {job.package_dir ?? "No local package directory"}
            </div>
            <label className="inline-flex">
              <input
                type="file"
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files)}
              />
              <Button type="button" variant="outline" asChild>
                <span>Upload file</span>
              </Button>
            </label>
            <div className="space-y-2">
              {readFiles(job).length === 0 ? (
                <div className="text-muted-foreground">This event task has no packaged files yet.</div>
              ) : (
                readFiles(job).map((file) => (
                  <div key={file} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <span className="font-mono text-xs">{file}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemoveFile(file)}
                    >
                      Remove file
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-[220px_1fr]">
              <Input
                value={scriptPath}
                onChange={(event) => setScriptPath(event.target.value)}
                placeholder="Script path"
              />
              <Button type="button" variant="outline" onClick={() => void handleCreateScript()}>
                Create script
              </Button>
            </div>
            <Textarea
              value={scriptContent}
              onChange={(event) => setScriptContent(event.target.value)}
              className="min-h-32 font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card className="py-0 lg:col-span-2">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 text-sm">
            {relatedRuns.length === 0 ? (
              <div className="text-muted-foreground">No runs recorded yet.</div>
            ) : (
              relatedRuns.map((run) => (
                <div key={run.id} className="rounded-md border px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{run.status}</span>
                    <span className="text-xs text-muted-foreground">
                      {run.trigger_event_name ?? run.started_at}
                    </span>
                  </div>
                  <div className="mt-2 text-muted-foreground">{run.result_summary || "No summary."}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void handleSaveChanges()}>
          Save changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void exportTemplate.mutateAsync()}
          disabled={exportTemplate.isPending}
        >
          Export template
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={exportTemplate.isPending || saveTemplate.isPending}
          onClick={async () => {
            const templatePackage = await exportTemplate.mutateAsync();
            const template = await saveTemplate.mutateAsync({
              id: `tpl-${job.id}`,
              name: `${job.name} template`,
              scope: "personal",
              manifest: templatePackage.manifest,
              files: templatePackage.files,
            });
            router.push(`/workspace/automation/templates/${template.id}`);
          }}
        >
          Save as template
        </Button>
        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete event task
        </Button>
      </div>

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete event task"
        description="This removes the event task and deletes its package directory with all packaged files."
        confirmText="Delete event task"
        confirmVariant="destructive"
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}

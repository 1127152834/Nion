"use client";

import { Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteCustomCliTool,
  loadCliToolsCatalog,
  loadCliToolsInstalled,
  type CliToolDefinition,
  type CliToolDescriptionRecord,
  type CliToolRuntimeInfo,
  type CustomCliTool,
} from "@/core/cli";
import { useI18n } from "@/core/i18n/hooks";

import { CliToolAddDialog } from "./cli-tool-add-dialog";
import { CliToolBatchDescribeDialog } from "./cli-tool-batch-describe-dialog";
import { CliToolCard } from "./cli-tool-card";
import { CliToolDetailDialog } from "./cli-tool-detail-dialog";
import { CliToolExtraDetailDialog } from "./cli-tool-extra-detail-dialog";
import { CliToolInstallDialog } from "./cli-tool-install-dialog";

type AutoDescCache = Record<string, CliToolDescriptionRecord>;

type CliToolsManagerProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  emptyAction?: React.ReactNode;
  installedActions?: React.ReactNode;
};

export function CliToolsManager({
  title,
  description,
  emptyAction,
  installedActions,
}: CliToolsManagerProps) {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";

  const [catalog, setCatalog] = useState<CliToolDefinition[]>([]);
  const [runtimeInfos, setRuntimeInfos] = useState<CliToolRuntimeInfo[]>([]);
  const [extraDetected, setExtraDetected] = useState<CliToolRuntimeInfo[]>([]);
  const [customTools, setCustomTools] = useState<CustomCliTool[]>([]);
  const [autoDescriptions, setAutoDescriptions] = useState<AutoDescCache>({});
  const [platform, setPlatform] = useState("");
  const [hasBrew, setHasBrew] = useState(true);
  const [loading, setLoading] = useState(true);

  const [detailTool, setDetailTool] = useState<{
    tool: CliToolDefinition;
    canInstall: boolean;
  } | null>(null);
  const [extraDetailTool, setExtraDetailTool] = useState<{
    displayName: string;
    runtimeInfo: CliToolRuntimeInfo;
  } | null>(null);
  const [installTool, setInstallTool] = useState<{
    tool: CliToolDefinition;
    method: string;
  } | null>(null);
  const [batchDescribeOpen, setBatchDescribeOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catalogData, installedData] = await Promise.all([
        loadCliToolsCatalog(),
        loadCliToolsInstalled(),
      ]);
      setCatalog(catalogData);
      setRuntimeInfos(installedData.tools);
      setExtraDetected(installedData.extra);
      setCustomTools(installedData.custom);
      setAutoDescriptions(installedData.descriptions);
      setPlatform(installedData.platform);
      setHasBrew(installedData.hasBrew);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    const handleOpenAdd = () => setAddDialogOpen(true);
    const handleOpenBatchDescribe = () => setBatchDescribeOpen(true);

    window.addEventListener("nion-open-cli-tool-add", handleOpenAdd);
    window.addEventListener("nion-open-cli-batch-describe", handleOpenBatchDescribe);
    return () => {
      window.removeEventListener("nion-open-cli-tool-add", handleOpenAdd);
      window.removeEventListener("nion-open-cli-batch-describe", handleOpenBatchDescribe);
    };
  }, []);

  const runtimeInfoById = useMemo(
    () => new Map(runtimeInfos.map((item) => [item.id, item])),
    [runtimeInfos],
  );

  const installedCatalogTools = useMemo(
    () =>
      catalog.filter((tool) => {
        const runtime = runtimeInfoById.get(tool.id);
        return runtime && runtime.status !== "not_installed";
      }),
    [catalog, runtimeInfoById],
  );

  const recommendedTools = useMemo(
    () =>
      catalog.filter((tool) => {
        const runtime = runtimeInfoById.get(tool.id);
        return !runtime || runtime.status === "not_installed";
      }),
    [catalog, runtimeInfoById],
  );

  const batchDescribeToolIds = useMemo(
    () => [...extraDetected.map((item) => item.id), ...customTools.map((item) => item.id)],
    [customTools, extraDetected],
  );

  return (
    loading ? (
      <div className="text-sm text-muted-foreground">
        {isZh ? "加载中..." : "Loading..."}
      </div>
    ) : (
      <div className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              {title ? <div className="text-xl font-semibold">{title}</div> : null}
              {description ? (
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>
            {installedCatalogTools.length === 0 &&
              extraDetected.length === 0 &&
              customTools.length === 0 &&
              emptyAction}
          </div>

          {(installedCatalogTools.length > 0 ||
            extraDetected.length > 0 ||
            customTools.length > 0) && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {isZh ? "已安装" : "Installed"}
                </h3>
                {installedActions}
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {installedCatalogTools.map((tool) => (
                  <CliToolCard
                    key={tool.id}
                    tool={tool}
                    runtimeInfo={runtimeInfoById.get(tool.id)}
                    variant="installed"
                    autoDescription={autoDescriptions[tool.id]}
                    onDetail={() => setDetailTool({ tool, canInstall: false })}
                    locale={locale}
                    platform={platform}
                  />
                ))}

                {extraDetected.map((runtime) => {
                  const displayName = runtime.displayName ?? runtime.id;
                  return (
                    <div
                      key={runtime.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/50"
                      onClick={() =>
                        setExtraDetailTool({
                          displayName,
                          runtimeInfo: runtime,
                        })
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-medium">
                            {displayName}
                          </h3>
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {isZh ? "系统检测" : "System Detected"}
                          </span>
                          {runtime.version && (
                            <span className="text-xs text-muted-foreground">
                              v{runtime.version}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {autoDescriptions[runtime.id]
                            ? isZh
                              ? autoDescriptions[runtime.id]!.zh
                              : autoDescriptions[runtime.id]!.en
                            : isZh
                              ? "还没有描述"
                              : "No description yet"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {customTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/50"
                    onClick={() =>
                      setExtraDetailTool({
                        displayName: tool.name,
                        runtimeInfo: {
                          id: tool.id,
                          status: "installed",
                          version: tool.version,
                          binPath: tool.binPath,
                        },
                      })
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium">{tool.name}</h3>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {isZh ? "自定义" : "Custom"}
                        </span>
                        {tool.version && (
                          <span className="text-xs text-muted-foreground">
                            v{tool.version}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {autoDescriptions[tool.id]
                          ? isZh
                            ? autoDescriptions[tool.id]!.zh
                            : autoDescriptions[tool.id]!.en
                          : tool.binPath}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await deleteCustomCliTool(tool.id);
                        await fetchData();
                      }}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              {isZh ? "推荐工具" : "Recommended"}
            </h3>

            {!hasBrew && (platform === "darwin" || platform === "linux") && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2.5">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {isZh ? "未检测到 Homebrew" : "Homebrew not detected"}
                  </p>
                  <p className="mt-1">
                    {isZh
                      ? "大多数推荐工具依赖 Homebrew 安装，可先在终端执行："
                      : "Most recommended tools rely on Homebrew. Install it with:"}
                  </p>
                  <code className="mt-1 block rounded bg-muted/50 px-2 py-1 font-mono text-[11px] select-all">
                    /bin/bash -c &quot;$(curl -fsSL
                    https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)&quot;
                  </code>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {recommendedTools.map((tool) => (
                <CliToolCard
                  key={tool.id}
                  tool={tool}
                  runtimeInfo={runtimeInfoById.get(tool.id)}
                  variant="recommended"
                  onDetail={() => setDetailTool({ tool, canInstall: true })}
                  onInstall={(selectedTool, method) =>
                    setInstallTool({ tool: selectedTool, method })
                  }
                  locale={locale}
                  platform={platform}
                />
              ))}
            </div>

            {recommendedTools.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isZh
                  ? "所有推荐工具都已经安装。"
                  : "All recommended tools are installed!"}
              </p>
            )}
          </section>

          {detailTool && (
            <CliToolDetailDialog
              open={Boolean(detailTool)}
              onOpenChange={(open) => !open && setDetailTool(null)}
              tool={detailTool.tool}
              locale={locale}
              onInstall={
                detailTool.canInstall
                  ? (tool, method) => setInstallTool({ tool, method })
                  : undefined
              }
              platform={platform}
            />
          )}

          {extraDetailTool && (
            <CliToolExtraDetailDialog
              open={Boolean(extraDetailTool)}
              onOpenChange={(open) => !open && setExtraDetailTool(null)}
              displayName={extraDetailTool.displayName}
              runtimeInfo={extraDetailTool.runtimeInfo}
              autoDescription={autoDescriptions[extraDetailTool.runtimeInfo.id]}
              locale={locale}
            />
          )}

          {installTool && (
            <CliToolInstallDialog
              open={Boolean(installTool)}
              onOpenChange={(open) => !open && setInstallTool(null)}
              tool={installTool.tool}
              method={installTool.method}
              onComplete={() => {
                setInstallTool(null);
                void fetchData();
              }}
              locale={locale}
            />
          )}

          <CliToolBatchDescribeDialog
            open={batchDescribeOpen}
            onOpenChange={setBatchDescribeOpen}
            toolIds={batchDescribeToolIds}
            existingDescriptions={autoDescriptions}
            onComplete={(results) => {
              setAutoDescriptions((current) => ({ ...current, ...results }));
              void fetchData();
            }}
            locale={locale}
          />

          <CliToolAddDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onComplete={() => void fetchData()}
            locale={locale}
          />
      </div>
    )
  );
}

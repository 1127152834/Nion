"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/core/i18n/hooks";
import { useToolPolicy } from "@/core/tool-policy/hooks";

function formatList(value: string[] | null | undefined, empty: string) {
  if (!value || value.length === 0) {
    return empty;
  }
  return value.join(", ");
}

export function ToolPolicyPage() {
  const { t } = useI18n();
  const { toolPolicy, isLoading, error } = useToolPolicy();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.toolPolicyPage.title}
          </h1>
          {toolPolicy ? <Badge variant="secondary">{toolPolicy.scope}</Badge> : null}
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {t.toolPolicyPage.description}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t.toolPolicyPage.scopeTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
              {t.toolPolicyPage.scopeLabel}
            </span>
            <Badge>{toolPolicy?.scope ?? t.toolPolicyPage.scopeUnknown}</Badge>
          </div>
          <p className="text-muted-foreground">
            {t.toolPolicyPage.outOfScopeNotice}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.toolPolicyPage.rulesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">
              {t.toolPolicyPage.loading}
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">
              {error instanceof Error ? error.message : t.toolPolicyPage.loadFailed}
            </div>
          ) : !toolPolicy || Object.keys(toolPolicy.rules).length === 0 ? (
            <div className="text-muted-foreground text-sm">
              {t.toolPolicyPage.emptyRules}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">{t.toolPolicyPage.table.surface}</th>
                    <th className="py-2 pr-4">{t.toolPolicyPage.table.allowedGroups}</th>
                    <th className="py-2 pr-4">{t.toolPolicyPage.table.deniedGroups}</th>
                    <th className="py-2 pr-4">{t.toolPolicyPage.table.allowedTools}</th>
                    <th className="py-2">{t.toolPolicyPage.table.deniedTools}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(toolPolicy.rules).map(([surface, rule]) => (
                    <tr key={surface} className="border-b align-top last:border-0">
                      <td className="py-3 pr-4 font-medium">{surface}</td>
                      <td className="py-3 pr-4">
                        {formatList(
                          rule.allowed_groups,
                          t.toolPolicyPage.table.empty,
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {formatList(
                          rule.denied_groups,
                          t.toolPolicyPage.table.empty,
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {formatList(
                          rule.allowed_tools,
                          t.toolPolicyPage.table.empty,
                        )}
                      </td>
                      <td className="py-3">
                        {formatList(
                          rule.denied_tools,
                          t.toolPolicyPage.table.empty,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.toolPolicyPage.catalogTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">
              {t.toolPolicyPage.loading}
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">
              {error instanceof Error ? error.message : t.toolPolicyPage.loadFailed}
            </div>
          ) : !toolPolicy || toolPolicy.catalog.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              {t.toolPolicyPage.emptyCatalog}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">{t.toolPolicyPage.catalogTable.name}</th>
                    <th className="py-2 pr-4">{t.toolPolicyPage.catalogTable.group}</th>
                    <th className="py-2 pr-4">{t.toolPolicyPage.catalogTable.source}</th>
                    <th className="py-2">{t.toolPolicyPage.catalogTable.policyManaged}</th>
                  </tr>
                </thead>
                <tbody>
                  {toolPolicy.catalog.map((entry) => (
                    <tr key={entry.name} className="border-b align-top last:border-0">
                      <td className="py-3 pr-4 font-medium">{entry.name}</td>
                      <td className="py-3 pr-4">{entry.group}</td>
                      <td className="py-3 pr-4">{entry.source}</td>
                      <td className="py-3">
                        {entry.policy_managed
                          ? t.toolPolicyPage.yes
                          : t.toolPolicyPage.no}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

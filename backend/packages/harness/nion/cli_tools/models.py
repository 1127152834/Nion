from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CliToolStatus = Literal["not_installed", "installed", "needs_auth", "ready"]
CliToolCategory = Literal[
    "media",
    "data",
    "search",
    "download",
    "document",
    "productivity",
]
CliToolPlatform = Literal["darwin", "linux", "win32"]
CliToolSetupType = Literal["simple", "needs_auth"]


class LocalizedText(BaseModel):
    zh: str
    en: str


class LocalizedList(BaseModel):
    zh: list[str]
    en: list[str]


class CliToolExamplePrompt(BaseModel):
    label: str
    promptZh: str
    promptEn: str


class CliToolStructuredDesc(BaseModel):
    intro: LocalizedText
    useCases: LocalizedList
    guideSteps: LocalizedList
    examplePrompts: list[CliToolExamplePrompt] = Field(default_factory=list)


class CliToolInstallMethod(BaseModel):
    method: str
    command: str
    platforms: list[CliToolPlatform]


class CliToolDefinition(BaseModel):
    id: str
    name: str
    binNames: list[str]
    summaryZh: str
    summaryEn: str
    categories: list[CliToolCategory]
    installMethods: list[CliToolInstallMethod]
    setupType: CliToolSetupType = "simple"
    detailIntro: LocalizedText
    useCases: LocalizedList
    guideSteps: LocalizedList
    examplePrompts: list[CliToolExamplePrompt] = Field(default_factory=list)
    homepage: str | None = None
    repoUrl: str | None = None
    officialDocsUrl: str | None = None
    supportsAutoDescribe: bool = True


class CliToolRuntimeInfo(BaseModel):
    id: str
    displayName: str | None = None
    status: CliToolStatus
    version: str | None = None
    binPath: str | None = None


class CustomCliTool(BaseModel):
    id: str
    name: str
    binPath: str
    binName: str
    version: str | None = None
    installMethod: str = "unknown"
    installPackage: str = ""
    enabled: bool = True
    createdAt: str
    updatedAt: str


class CliToolDescriptionRecord(BaseModel):
    zh: str
    en: str
    structured: CliToolStructuredDesc | None = None


class CliToolCatalogProjectionItem(BaseModel):
    id: str
    displayName: str | None = None
    enabled: bool = True
    allowed: bool = True
    installed: bool = False
    configured: bool = False
    source: str = "host-detected"
    description: str = ""
    path: str | None = None
    version: str | None = None

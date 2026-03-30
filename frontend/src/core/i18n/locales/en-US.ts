import {
  CompassIcon,
  FolderKanbanIcon,
  GraduationCapIcon,
  ImageIcon,
  MicroscopeIcon,
  PenLineIcon,
  ShapesIcon,
  SparklesIcon,
  VideoIcon,
} from "lucide-react";

import type { Translations } from "./types";

export const enUS: Translations = {
  // Locale meta
  locale: {
    localName: "English",
  },

  // Common
  common: {
    home: "Home",
    settings: "Settings",
    delete: "Delete",
    select: "Select",
    rename: "Rename",
    share: "Share",
    openInNewWindow: "Open in new window",
    close: "Close",
    more: "More",
    search: "Search",
    download: "Download",
    thinking: "Thinking",
    artifacts: "Artifacts",
    workingDirectory: "Working Directory",
    browseWorkspace: "Browse workspace files",
    public: "Public",
    custom: "Custom",
    notAvailableInDemoMode: "Not available in demo mode",
    loading: "Loading...",
    version: "Version",
    lastUpdated: "Last updated",
    code: "Code",
    preview: "Preview",
    cancel: "Cancel",
    save: "Save",
    install: "Install",
    create: "Create",
    export: "Export",
    exportAsMarkdown: "Export as Markdown",
    exportAsJSON: "Export as JSON",
    exportSuccess: "Conversation exported",
  },

  // Welcome
  welcome: {
    greeting: "Hello, again!",
    description:
      "One thought, everything delivered. Your personal AI assistant that understands your intent and acts for you.",

    createYourOwnSkill: "Create Your Own Skill",
    createYourOwnSkillDescription:
      "Create your own skill to release the power of Nion. With customized skills,\nNion can help you search on the web, analyze data, and generate\n artifacts like slides, web pages and do almost anything.",
  },

  // Clipboard
  clipboard: {
    copyToClipboard: "Copy to clipboard",
    copiedToClipboard: "Copied to clipboard",
    failedToCopyToClipboard: "Failed to copy to clipboard",
    linkCopied: "Link copied to clipboard",
  },

  // Input Box
  inputBox: {
    placeholder: "How can I assist you today?",
    clarificationPlaceholder: "Choose an option, or type your answer",
    clarificationReplying: "Replying to",
    clarificationHelper: "Replying will continue the current task",
    clarificationChooseOption: "Choose an option",
    clarificationSubmitChoice: "Send choice",
    createSkillPrompt:
      "We're going to build a new skill step by step with `skill-creator`. To start, what do you want this skill to do?",
    addAttachments: "Add attachments",
    mode: "Mode",
    flashMode: "Flash",
    flashModeDescription: "Fast and efficient, but may not be accurate",
    reasoningMode: "Reasoning",
    reasoningModeDescription:
      "Reasoning before action, balance between time and accuracy",
    proMode: "Pro",
    proModeDescription:
      "Reasoning, planning and executing, get more accurate results, may take more time",
    ultraMode: "Ultra",
    ultraModeDescription:
      "Pro mode with subagents to divide work; best for complex multi-step tasks",
    reasoningEffort: "Reasoning Effort",
    reasoningEffortMinimal: "Minimal",
    reasoningEffortMinimalDescription: "Retrieval + Direct Output",
    reasoningEffortLow: "Low",
    reasoningEffortLowDescription: "Simple Logic Check + Shallow Deduction",
    reasoningEffortMedium: "Medium",
    reasoningEffortMediumDescription:
      "Multi-layer Logic Analysis + Basic Verification",
    reasoningEffortHigh: "High",
    reasoningEffortHighDescription:
      "Full-dimensional Logic Deduction + Multi-path Verification + Backward Check",
    searchModels: "Search models...",
    surpriseMe: "Surprise",
    surpriseMePrompt: "Surprise me",
    followupLoading: "Generating follow-up questions...",
    followupConfirmTitle: "Send suggestion?",
    followupConfirmDescription:
      "You already have text in the input. Choose how to send it.",
    followupConfirmAppend: "Append & send",
    followupConfirmReplace: "Replace & send",
    suggestions: [
      {
        suggestion: "Write",
        prompt: "Write a blog post about the latest trends on [topic]",
        icon: PenLineIcon,
      },
      {
        suggestion: "Research",
        prompt:
          "Conduct a deep dive research on [topic], and summarize the findings.",
        icon: MicroscopeIcon,
      },
      {
        suggestion: "Collect",
        prompt: "Collect data from [source] and create a report.",
        icon: ShapesIcon,
      },
      {
        suggestion: "Learn",
        prompt: "Learn about [topic] and create a tutorial.",
        icon: GraduationCapIcon,
      },
    ],
    suggestionsCreate: [
      {
        suggestion: "Webpage",
        prompt: "Create a webpage about [topic]",
        icon: CompassIcon,
      },
      {
        suggestion: "Image",
        prompt: "Create an image about [topic]",
        icon: ImageIcon,
      },
      {
        suggestion: "Video",
        prompt: "Create a video about [topic]",
        icon: VideoIcon,
      },
      {
        type: "separator",
      },
      {
        suggestion: "Project",
        prompt: "Create a new long-running project for [goal]",
        icon: FolderKanbanIcon,
        action: "create-project",
      },
      {
        suggestion: "Skill",
        prompt:
          "We're going to build a new skill step by step with `skill-creator`. To start, what do you want this skill to do?",
        icon: SparklesIcon,
      },
    ],
  },

  // Sidebar
  sidebar: {
    newChat: "New chat",
    chats: "Chats",
    recentChats: "Recent chats",
    demoChats: "Demo chats",
    pendingReply: "Pending reply",
    agents: "Agents",
    projects: "Projects",
    automation: "Automation",
    cliTools: "CLI Tools",
    notebook: "Notebook",
  },

  // Agents
  agents: {
    title: "Agents",
    description:
      "Create and manage custom agents with specialized prompts and capabilities.",
    newAgent: "New Agent",
    emptyTitle: "No custom agents yet",
    emptyDescription:
      "Create your first custom agent with a specialized system prompt.",
    chat: "Chat",
    delete: "Delete",
    deleteConfirm:
      "Are you sure you want to delete this agent? This action cannot be undone.",
    deleteSuccess: "Agent deleted",
    builtinBadge: "Built-in",
    newChat: "New chat",
    createPageTitle: "Design your Agent",
    createPageSubtitle:
      "Describe the agent you want — I'll help you create it through conversation.",
    nameStepTitle: "Name your new Agent",
    nameStepHint:
      "Letters, digits, and hyphens only — stored lowercase (e.g. code-reviewer)",
    nameStepPlaceholder: "e.g. code-reviewer",
    nameStepContinue: "Continue",
    nameStepInvalidError:
      "Invalid name — use only letters, digits, and hyphens",
    nameStepAlreadyExistsError: "An agent with this name already exists",
    nameStepCheckError: "Could not verify name availability — please try again",
    nameStepBootstrapMessage:
      "The new custom agent name is {name}. Let's bootstrap it's **SOUL**.",
    agentCreated: "Agent created!",
    startChatting: "Start chatting",
    backToGallery: "Back to Gallery",
  },

  // Breadcrumb
  breadcrumb: {
    workspace: "Workspace",
    chats: "Chats",
  },

  // Workspace
  workspace: {
    officialWebsite: "Nion's official website",
    githubTooltip: "Nion on Github",
    settingsAndMore: "Settings and more",
    visitGithub: "Nion on GitHub",
    reportIssue: "Report a issue",
    contactUs: "Contact us",
    about: "About Nion",
    singleWorkspaceLabel: "Workspace",
    singleWorkspacePath: "~/.nion-data/workspace",
    singleWorkspaceHint:
      "Files stay in this app's working area by default.",
    runtimeMode: {
      sandboxLabel: "Sandbox",
      hostLabel: "Host",
      sandboxTip:
        "Run inside the thread sandbox. Outputs stay under the thread workdir by default.",
      hostTip:
        "Allow backend host execution. On web, host mode does not require a directory up front and still defaults to sandbox storage unless a host folder is explicitly bound.",
      hostBoundDirectory: "Bound host directory",
      locked: "This runtime profile is locked.",
      lockedTip: "Once a host directory is bound, the profile cannot be rebound for this thread.",
      modeSaveFailed: "Failed to save runtime mode.",
    },
    requestError: {
      title: "Couldn't get a reply",
      modelUnavailable:
        "The selected model is unavailable right now. Try another model or try again later.",
      authenticationFailed:
        "The model provider rejected the current credentials. Check the provider settings and try again.",
      runtimeUnavailable:
        "Nion couldn't reach the runtime service. Restart the desktop app or refresh the page, then try again.",
      generic:
        "This request didn't finish successfully. Try again, or switch to another model if the problem continues.",
      detailsLabel: "Technical details",
    },
  },

  // Conversation
  conversation: {
    noMessages: "No messages yet",
    startConversation: "Start a conversation to see messages here",
  },

  // Chats
  chats: {
    searchChats: "Search chats",
    selectedCount: "{count} selected",
  },

  bridge: {
    menuLabel: "Bridge",
    desktopOnly: "Bridge is only available in the desktop app.",
    nav: {
      overview: "Bridge",
      diagnostics: "Diagnostics",
      telegram: "Telegram",
      feishu: "Feishu",
      discord: "Discord",
      qq: "QQ",
      weixin: "Weixin",
    },
    overview: {
      title: "Bridge",
      description: "Connect external messaging channels to the main assistant.",
      enableTitle: "Enable Bridge",
      enableDescription:
        "Allow external messaging channels to talk to the main assistant.",
      autoStartTitle: "Auto Start",
      autoStartDescription:
        "Start the bridge automatically when the desktop app opens.",
      statusTitle: "Status",
      statusDescription: "A quick view of the current desktop bridge state.",
      runtimeLabel: "Runtime",
      running: "Running",
      stopped: "Stopped",
      enabledPlatformsLabel: "Enabled Platforms",
      activePlatformsLabel: "Active Platforms",
      currentBindingsTitle: "Current Bindings",
      currentBindingsDescription:
        "Active bridge chat bindings currently stored on desktop.",
      noBindings: "No bindings yet.",
      platformLabel: "Platform",
      chatLabel: "Chat",
      threadLabel: "Thread",
      workingDirectoryLabel: "Working Dir",
      defaultWorkspaceTitle: "Default Workspace",
      defaultWorkspaceDescription:
        "New bridge conversations inherit these defaults.",
      workingDirectoryTitle: "Working Directory",
      defaultModelTitle: "Default Model",
      defaultProviderTitle: "Default Provider",
      channelsTitle: "Channels",
      channelsDescription:
        "Enable or disable each supported bridge channel.",
      saveDefaultsAction: "Save Defaults",
      startAction: "Start Bridge",
      stopAction: "Stop Bridge",
    },
    diagnostics: {
      title: "Diagnostics",
      description:
        "Review bridge incidents, inspect evidence, and confirm bounded recovery actions.",
      diagnoseAction: "Diagnose Bridge",
      empty: "No bridge incidents yet.",
      selectIncident: "Select an incident after running a diagnosis.",
      hypothesisLabel: "Hypothesis",
      recommendedActionsTitle: "Recommended Actions",
      noActions: "No executable actions suggested for this incident.",
      confirmRunAction: "Confirm and Run",
      dismissAction: "Dismiss Incident",
      advisoryOnly: "Advisory only",
      lastActionResultTitle: "Last Action Result",
      confirmRunPrompt: 'Run "{label}"?',
    },
    telegram: {
      title: "Telegram Settings",
      description: "Connect your Telegram bot.",
      saveAction: "Save Telegram Settings",
      testAction: "Test Connection",
      botTokenPlaceholder: "bridge_telegram_bot_token",
      chatIdPlaceholder: "bridge_telegram_chat_id",
      allowedUsersPlaceholder: "telegram_bridge_allowed_users",
    },
    feishu: {
      title: "Feishu Settings",
      description: "Connect your Feishu or Lark app.",
      saveAction: "Save Feishu Settings",
      testAction: "Test Connection",
      appIdPlaceholder: "bridge_feishu_app_id",
      appSecretPlaceholder: "bridge_feishu_app_secret",
      allowFromPlaceholder: "bridge_feishu_allow_from",
      groupAllowFromPlaceholder: "bridge_feishu_group_allow_from",
      domainFeishu: "Feishu",
      domainLark: "Lark",
      dmPolicyOpen: "DM Policy: open",
      dmPolicyPairing: "DM Policy: pairing",
      dmPolicyAllowlist: "DM Policy: allowlist",
      dmPolicyDisabled: "DM Policy: disabled",
      groupPolicyOpen: "Group Policy: open",
      groupPolicyAllowlist: "Group Policy: allowlist",
      groupPolicyDisabled: "Group Policy: disabled",
      threadSession: "Thread Session",
      requireMention: "Require Mention",
    },
    discord: {
      title: "Discord Settings",
      description: "Connect your Discord bot.",
      saveAction: "Save Discord Settings",
      testAction: "Test Connection",
      botTokenPlaceholder: "bridge_discord_bot_token",
      allowedUsersPlaceholder: "bridge_discord_allowed_users",
      allowedChannelsPlaceholder: "bridge_discord_allowed_channels",
      allowedGuildsPlaceholder: "bridge_discord_allowed_guilds",
      groupPolicyOpen: "Group Policy: open",
      groupPolicyDisabled: "Group Policy: disabled",
      requireMention: "Require Mention",
      streamPreview: "Stream Preview",
      maxAttachmentPlaceholder: "bridge_discord_max_attachment_size",
      imageHandling: "Enable Image Handling",
    },
    qq: {
      title: "QQ Settings",
      description: "Connect your QQ bot app.",
      saveAction: "Save QQ Settings",
      testAction: "Test Connection",
      appIdPlaceholder: "bridge_qq_app_id",
      appSecretPlaceholder: "bridge_qq_app_secret",
      allowedUsersPlaceholder: "bridge_qq_allowed_users",
      imageHandling: "Enable Image Handling",
      maxImageSizePlaceholder: "bridge_qq_max_image_size",
    },
    weixin: {
      title: "Weixin Settings",
      description: "Manage Weixin bridge accounts.",
      accounts: "Accounts",
      accountsDesc: "Linked Weixin accounts available to the bridge.",
      addAccount: "Add Account",
      qrLogin: "QR Login",
      qrWaiting: "Waiting for scan",
      qrScanned: "QR code scanned",
      qrConfirmed: "Account linked",
      qrExpired: "QR code expired",
      qrFailed: "QR login failed",
      currentBindings: "Current Weixin bindings",
      noAccounts: "No Weixin accounts linked yet.",
      accountActive: "Active",
      accountPaused: "Paused",
      accountExpired: "Token expired",
    },
  },

  // Page titles (document title)
  pages: {
    appName: "Nion",
    chats: "Chats",
    newChat: "New chat",
    notebook: "Notebook",
    untitled: "Untitled",
  },

  notebookPage: {
    title: "Notebook",
    description:
      "Write in Markdown, organize your documents freely, and let Nion help with editing while keeping full history.",
    emptyTitle: "No notes yet",
    emptyDescription:
      "Create your first note to start building your personal desktop knowledge base.",
    createNote: "New note",
    createFolder: "Create folder",
    createNoteHere: "New note here",
    createSubfolder: "Create subfolder",
    renameFolder: "Rename folder",
    deleteFolder: "Delete folder",
    confirmCreateFolder: "Create folder",
    confirmRenameFolder: "Save folder",
    confirmDeleteFolder: "Delete folder",
    deleteFolderDescription: 'Delete "{folder}"? Only empty folders can be removed.',
    folderNameLabel: "Folder name",
    folderNamePlaceholder: "e.g. Alpha",
    folderSaveToPrefix: "Save to: ",
    rootFolderLabel: "Top level",
    noteTitlePlaceholder: "Note title",
    noteDirectoryPlaceholder: "Choose a folder",
    saveToLabel: "Save to",
    inboxLabel: "Inbox",
    selectFolderPlaceholder: "Choose a folder",
    folderPickerEmpty: "No folders found",
    save: "Save",
    confirmSaveDraft: "Save note",
    saving: "Saving...",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saveDraft: "Save note",
    draftMetaLabel: "Unsaved draft",
    draftDirectoryPending: "Choose a folder on first save",
    untitledDraftTitle: "Untitled note",
    rename: "Rename",
    move: "Move",
    history: "History",
    restore: "Restore",
    delete: "Delete",
    selectNote: "Select note",
    noSelectionTitle: "Choose a note",
    noSelectionDescription:
      "Pick a note from the list or create a new one to start writing.",
    noteListTitle: "Notes",
    noteListDescription: "Browse the notebook folders and open a Markdown note.",
    historyTitle: "Version history",
    historyDescription:
      "Review changes over time and restore an earlier version if needed.",
    deleteConfirmTitle: "Delete note",
    deleteConfirmDescription:
      'Delete "{title}"? The note can be recovered from notebook trash later.',
    deleteConfirmAction: "Delete note",
    movePlaceholder: "Choose a folder",
    renamePlaceholder: "New note title",
    createDialogTitle: "Save note",
    createDialogDescription:
      "Add a title and choose where this note should be saved.",
    assistTitle: "Ask Nion to help",
    assistDescription:
      "Open a new chat with this note prefilled as context for rewriting, summarizing, or extracting actions.",
    assistSummarize: "Summarize",
    assistRewrite: "Rewrite",
    assistExpand: "Expand",
    assistChecklist: "Checklist",
    assistActionItems: "Action items",
    quickCapture: "Quick capture",
    quickCaptureDescription:
      "Capture a thought quickly and save it straight into your notebook inbox.",
    quickCaptureHint: "Write down the idea before it disappears...",
    quickCaptureSaved: "Quick capture saved",
    quickCaptureDestination: "Will save to: {folder}",
    searchPlaceholder: "Search notes...",
    recentTitle: "Recent notes",
    preview: "Preview",
    edit: "Edit",
    askTab: "Notebook Assistant",
    historyTab: "History",
    infoTab: "Info",
    infoNoteId: "Note ID",
    infoPath: "Path",
    infoCreatedAt: "Created at",
    infoUpdatedAt: "Updated at",
    infoContentHash: "Content hash",
    saveFromChat: "Save to notebook",
    saveLastReply: "Save last reply",
    trashTitle: "Notebook trash",
    trashDescription:
      "Recover deleted notes before they are permanently purged in a later workflow.",
    trashEmpty: "No deleted notes yet.",
    restoreDeleted: "Restore deleted note",
  },

  // Tool calls
  toolCalls: {
    moreSteps: (count: number) => `${count} more step${count === 1 ? "" : "s"}`,
    lessSteps: "Less steps",
    executeCommand: "Execute command",
    presentFiles: "Present files",
    needYourHelp: "Need your help",
    useTool: (toolName: string) => `Use "${toolName}" tool`,
    searchFor: (query: string) => `Search for "${query}"`,
    searchForRelatedInfo: "Search for related information",
    searchForRelatedImages: "Search for related images",
    searchForRelatedImagesFor: (query: string) =>
      `Search for related images for "${query}"`,
    searchOnWebFor: (query: string) => `Search on the web for "${query}"`,
    viewWebPage: "View web page",
    listFolder: "List folder",
    readFile: "Read file",
    writeFile: "Write file",
    clickToViewContent: "Click to view file content",
    writeTodos: "Update to-do list",
    skillInstallTooltip: "Install skill and make it available to Nion",
  },

  // Subtasks
  uploads: {
    uploading: "Uploading...",
    uploadingFiles: "Uploading files, please wait...",
  },

  subtasks: {
    subtask: "Subtask",
    executing: (count: number) =>
      `Executing ${count === 1 ? "" : count + " "}subtask${count === 1 ? "" : "s in parallel"}`,
    in_progress: "Running subtask",
    completed: "Subtask completed",
    failed: "Subtask failed",
  },

  tokenUsage: {
    title: "Token Usage",
    input: "Input",
    output: "Output",
    total: "Total",
  },

  // Shortcuts
  shortcuts: {
    searchActions: "Search actions...",
    noResults: "No results found.",
    actions: "Actions",
    keyboardShortcuts: "Keyboard Shortcuts",
    keyboardShortcutsDescription:
      "Navigate Nion faster with keyboard shortcuts.",
    openCommandPalette: "Open Command Palette",
    toggleSidebar: "Toggle Sidebar",
  },

  // Settings
  settings: {
    title: "Settings",
    description: "Adjust how Nion looks and behaves for you.",
    loadingState: "Loading config center…",
    configCenterError: "Config center is unavailable right now.",
    navGroups: {
      experience: "Experience",
      conversation: "Conversation",
      knowledge: "Knowledge & Memory",
      capabilities: "Tools & Skills",
      system: "System",
    },
    sections: {
      appearance: "Appearance",
      models: "Models",
      sessionPolicy: "Session Policy",
      memory: "Memory",
      automation: "Automation",
      tools: "Tools",
      search: "Search",
      cliTools: "CLI Tools",
      agentIntegrations: "Agent Integrations",
      mcpServers: "MCP servers",
      skills: "Skills",
      sandbox: "Sandbox",
      notification: "Notification",
      daemon: "Daemon",
      about: "About",
    },
    agentIntegrations: {
      title: "Agent Integrations",
      description:
        "Configure external ACP-compatible agents before wiring runtime behavior.",
      empty:
        "No ACP adapter is configured yet. This page will become the home for Codex and Claude Code integrations.",
      knownAgents: {
        codex: "Codex",
        claudeCode: "Claude Code",
      },
      fields: {
        enabled: "Enabled",
        command: "Command",
        args: "Arguments",
        description: "Description",
        model: "Model",
        autoApprovePermissions: "Auto-approve permissions",
        env: "Environment variables",
      },
    },
    daemon: {
      title: "Daemon",
      description:
        "Control whether the local runtime stays alive after the desktop window closes.",
      allowBackgroundRunningLabel: "Allow background running",
      allowBackgroundRunningHint:
        "When enabled, closing the Electron window keeps the local daemon alive. When disabled, the daemon exits shortly after the desktop client detaches.",
    },
    memory: {
      title: "Memory",
      description:
        "Nion automatically learns from your conversations in the background. These memories help Nion understand you better and deliver a more personalized experience.",
      empty: "No memory data to display.",
      rawJson: "Raw JSON",
      clearAll: "Clear all memory",
      clearAllConfirmTitle: "Clear all memory?",
      clearAllConfirmDescription:
        "This will remove all saved summaries and facts. This action cannot be undone.",
      clearAllSuccess: "All memory cleared",
      factDeleteConfirmTitle: "Delete this fact?",
      factDeleteConfirmDescription:
        "This fact will be removed from memory immediately. This action cannot be undone.",
      factDeleteSuccess: "Fact deleted",
      noFacts: "No saved facts yet.",
      summaryReadOnly:
        "Summary sections are read-only for now. You can currently clear all memory or delete individual facts.",
      memoryFullyEmpty: "No memory saved yet.",
      factPreviewLabel: "Fact to delete",
      searchPlaceholder: "Search current memory",
      filterAll: "All",
      filterFacts: "Facts",
      filterSummaries: "Summaries",
      noMatches: "No matching memory found.",
      surfaces: {
        provider: {
          title: "Memory Provider",
          description:
            "Choose which memory backend powers notebook retrieval, long-term memory, AutoDream, identity, and soul.",
          modeSummary: "OpenViking modes: embedded / remote",
          activeModeLabel: "Active OpenViking mode",
        },
        console: {
          title: "Memory Console",
          description:
            "Search and inspect the memory Nion is currently using, then clean up stale facts when needed.",
        },
        agentCore: {
          title: "Self-Maintenance",
          description:
            "Reflective maintenance for the agent itself. This area is for AutoDream and future self-upgrade proposals, not for notebook content.",
        },
      },
      autodream: {
        title: "AutoDream",
        description:
          "Run a manual reflective pass and inspect the latest Dream Log summary before future maintenance loops are automated.",
        runPlaceholder: "Run AutoDream now",
        runButton: "Run AutoDream now",
        emptySummary: "No summary",
      },
      storage: {
        title: "Memory storage",
        description:
          "Choose the persistence provider that stores long-term memory updates.",
        modeLabel: "Storage mode",
        fileMode: "File storage",
        customMode: "Custom provider",
        customClassLabel: "Custom storage class",
        customClassPlaceholder:
          "nion.agents.memory.storage.FileMemoryStorage",
      },
      recall: {
        title: "Memory Search",
        description:
          "Search long-term memory and conversation history in one place. Good for people, projects, preferences, and recent topics.",
        placeholder: "Search people, projects, preferences, or past discussions",
        searchButton: "Search",
        idle: "Enter a keyword to search long-term memory and conversation history.",
        empty: "No matching memory found.",
        loadFailed: "Conversation history results are temporarily unavailable.",
        structuredTitle: "Long-term memory",
        structuredEmpty: "No matching long-term memory found.",
        historyTitle: "Conversation history",
        historyEmpty: "No matching conversation history found.",
        overviewTitle: "Current memory overview",
        overviewDescription:
          "This is the memory Nion has currently organized and will keep updating over time.",
        threadLabel: "Thread",
        agentLabel: "Agent",
      },
      openviking: {
        title: "Embedded OpenViking Notebook Resources",
        description:
          "Internal operator surface for rebuilding the notebook resource index and inspecting embedded OpenViking retrieval results.",
        previewTitle: "Preview context",
        reindexButton: "Reindex notebook",
        reindexingButton: "Reindexing notebook...",
        reindexResult: "Indexed {count} notes in this run",
        searchPlaceholder: "Search notebook resources",
        searchButton: "Search notebook resources",
        idle: "Enter a keyword to search the embedded OpenViking notebook resource layer.",
        empty: "No matching notebook resources found.",
        loadFailed: "Notebook resource results are temporarily unavailable.",
        headingLabel: "Heading path",
        rangeLabel: "Character range",
      },
      markdown: {
        overview: "Overview",
        userContext: "User context",
        work: "Work",
        personal: "Personal",
        topOfMind: "Top of mind",
        historyBackground: "History",
        recentMonths: "Recent months",
        earlierContext: "Earlier context",
        longTermBackground: "Long-term background",
        updatedAt: "Updated at",
        facts: "Facts",
        empty: "(empty)",
        table: {
          category: "Category",
          confidence: "Confidence",
          confidenceLevel: {
            veryHigh: "Very high",
            high: "High",
            normal: "Normal",
            unknown: "Unknown",
          },
          content: "Content",
          source: "Source",
          createdAt: "CreatedAt",
          view: "View",
        },
      },
    },
    appearance: {
      themeTitle: "Theme",
      themeDescription:
        "Choose how the interface follows your device or stays fixed.",
      system: "System",
      light: "Light",
      dark: "Dark",
      systemDescription: "Match the operating system preference automatically.",
      lightDescription: "Bright palette with higher contrast for daytime.",
      darkDescription: "Dim palette that reduces glare for focus.",
      languageTitle: "Language",
      languageDescription: "Switch between languages.",
    },
    models: {
      title: "Models",
      description:
        "Configure providers and runnable models, then expose the saved default model to chat.",
    },
    sessionPolicy: {
      title: "Session Policy",
      description:
        "Configure follow-up suggestions, title generation, summarization, and subagent timeout policies.",
    },
    tools: {
      title: "Tools",
      description: "Manage built-in tool groups and runtime-visible tool presets.",
    },
    search: {
      title: "Search",
      description:
        "Configure only the search and fetch providers that are actually wired into the current web runtime.",
      loadConfigFailed: "Failed to load search settings",
      capabilityHint:
        "The current runtime supports one provider per capability. Donor-style provider fallback chains are intentionally not exposed until the backend supports them.",
      unsupportedProviderPrefix:
        "This capability is currently backed by an unsupported provider for the web settings UI:",
      unsupportedProviderHint:
        "You can keep the current runtime value, or switch to one of the supported providers below.",
      providerTitle: "Provider",
      providerPlaceholder: "Select a provider",
      enableLabel: "Enabled",
      docsAction: "Docs",
      supportedBadge: "Supported",
      unsupportedBadge: "Unsupported",
      noProviderFields: "This provider has no extra config fields in the current runtime.",
      capabilities: {
        web_search: {
          title: "Web Search",
          description:
            "Search the web and return structured results that can be cited in chat.",
        },
        web_fetch: {
          title: "Web Fetch",
          description:
            "Fetch and simplify page contents from URLs already discovered by the runtime.",
        },
        image_search: {
          title: "Image Search",
          description:
            "Search reference images for image generation and visual grounding tasks.",
        },
      },
      fields: {
        apiKey: {
          label: "API Key",
          placeholder: "Leave empty to use environment credentials if supported",
        },
        maxResults: {
          label: "Max results",
          placeholder: "5",
        },
        timeout: {
          label: "Timeout (seconds)",
          placeholder: "10",
        },
      },
      providers: {
        tavily: {
          label: "Tavily",
          webSearchTitle: "Tavily",
          webSearchDescription: "Agent-oriented web search with configurable result count.",
          webFetchTitle: "Tavily Extract",
          webFetchDescription: "Fetch page content through Tavily extract.",
        },
        firecrawl: {
          label: "Firecrawl",
          webSearchTitle: "Firecrawl",
          webSearchDescription: "Use Firecrawl search as the runtime web search provider.",
          webFetchTitle: "Firecrawl Scrape",
          webFetchDescription: "Fetch page content through Firecrawl scrape.",
        },
        jina_ai: {
          label: "Jina Reader",
          webFetchTitle: "Jina Reader",
          webFetchDescription: "Read and simplify webpage contents through Jina Reader.",
        },
        duckduckgo: {
          label: "DuckDuckGo",
          imageSearchTitle: "DuckDuckGo Images",
          imageSearchDescription: "Reference image search through DuckDuckGo.",
        },
      },
    },
    cliTools: {
      title: "CLI Tools",
      description:
        "Manage the runtime-visible CLI catalog that powers the composer CLI lane.",
      runtime: {
        hint:
          "This runtime currently exposes a detected CLI catalog only. Marketplace/install jobs are not shipped in this repository yet, so the settings page only manages lane visibility for the same catalog the composer uses.",
      },
      empty: "No CLI tools detected in the current runtime.",
      states: {
        enabled: "Enabled",
        disabled: "Disabled",
        installed: "Installed",
        missing: "Missing",
        configured: "Configured",
      },
      sources: {
        hostDetected: "Host detected",
      },
      labels: {
        path: "Path",
        source: "Source",
      },
      hints: {
        composer:
          "Disabling an item here removes it from the chat composer CLI shortcut lane because both surfaces read from /api/cli/catalog.",
      },
      defaults: {
        python3: "Python runtime",
        node: "Node.js runtime",
        git: "Git version control",
        pnpm: "pnpm package manager",
        uv: "uv Python package manager",
        generic: "CLI tool",
      },
      errors: {
        loadFailed: "Failed to load CLI catalog",
        saveFailed: "Failed to update CLI item",
      },
    },
    mcpServers: {
      title: "MCP servers",
      description: "Manage MCP server connections and available tools.",
    },
    sandbox: {
      title: "Sandbox",
      description: "Configure the sandbox provider and file-access boundary.",
    },
    skills: {
      title: "Agent Skills",
      description:
        "Manage the configuration and enabled status of the agent skills.",
      createSkill: "Create skill",
      emptyTitle: "No agent skill yet",
      emptyDescription:
        "Put your agent skill folders under the `/skills/custom` folder under the root folder of Nion.",
      emptyButton: "Create Your First Skill",
    },
    skillImportDialog: {
      title: "Import skill",
      description:
        "Install a .skill artifact by providing its source thread ID and virtual artifact path.",
      threadId: "Thread ID",
      threadIdPlaceholder: "thread-id",
      path: "Artifact path",
      pathPlaceholder: "/mnt/user-data/outputs/my-skill.skill",
      install: "Install",
      installing: "Installing...",
      close: "Close",
      success: 'Skill "{name}" installed',
    },
    skillPage: {
      createViaChat: "Create via chat",
      importFromAgents: "Import from agents",
      skillDeleted: "Skill deleted",
      deleteFailed: "Failed to delete skill",
      deleteConfirmTitle: "Delete skill",
      deleteConfirmDescription:
        'Delete skill "{name}"? This action cannot be undone.',
      cancelAction: "Cancel",
      confirmDeleteAction: "Delete",
    },
    notification: {
      title: "Notification",
      description:
        "Nion only sends a completion notification when the window is not active. This is especially useful for long-running tasks so you can switch to other work and get notified when done.",
      requestPermission: "Request notification permission",
      deniedHint:
        "Notification permission was denied. You can enable it in your browser's site settings to receive completion alerts.",
      testButton: "Send test notification",
      testTitle: "Nion",
      testBody: "This is a test notification.",
      notSupported: "Your browser does not support notifications.",
      disableNotification: "Disable notification",
    },
    automation: {
      title: "Automation",
      description:
        "Manage recurring and manual runtime jobs without turning them into loose scripts.",
      scheduler: "Scheduler",
      schedulerRunning: "Running",
      schedulerIdle: "Idle",
      jobs: "Jobs",
      runs: "Runs",
      diagnostics: "Diagnostics",
      failedRuns: "Failed runs",
      lastTick: "Last tick",
      notRecordedYet: "Not recorded yet",
      futureHooks: "Future hooks",
      futureHookLabels: {
        openvikingArchive: "OpenViking archive",
        relationshipAwareRoutines: "Relationship-aware routines",
        selfGrowthSuggestions: "Self-growth suggestions",
      },
      createJobTitle: "Create a job",
      createJobDescription:
        "V1 jobs run in isolated sessions and deliver through the runtime.",
      create: "Create",
      nameLabel: "Name",
      namePlaceholder: "Morning summary",
      deliveryModeLabel: "Delivery mode",
      deliveryModes: {
        local: "Local history",
        thread: "Thread",
        channel: "Channel",
        multi: "Multi-target",
      },
      promptLabel: "Prompt",
      promptPlaceholder: "Summarize the most important updates since the last run.",
      scheduleKindLabel: "Schedule kind",
      scheduleKinds: {
        once: "Once",
        interval: "Interval",
        cron: "Cron",
      },
      scheduleValueLabel: "Schedule value",
      scheduleHelp: {
        once: "Use an ISO timestamp, for example 2026-03-24T09:00:00Z.",
        interval: "Use seconds, for example 900 for every 15 minutes.",
        cron: "Use a standard cron expression, for example */30 * * * *.",
      },
      attachedSkillsLabel: "Attached skills",
      attachedSkillsPlaceholder: "memory, calendar, channel-summary",
      jobsTitle: "Jobs",
      jobsDescription: "Create, pause, resume, run, and remove automation jobs.",
      emptyJobs: "No automation jobs yet.",
      recentRunsTitle: "Recent runs",
      recentRunsDescription:
        "Observe the last runtime outcomes without leaving settings.",
      emptyRuns: "No runs recorded yet.",
      stateLabels: {
        scheduled: "scheduled",
        paused: "paused",
        error: "error",
        succeeded: "succeeded",
        failed: "failed",
      },
      schedulePrefix: "Schedule",
      deliveryPrefix: "Delivery",
      nextRunPrefix: "Next run",
      notScheduled: "Not scheduled",
      lastResult: "Last result",
      noSummary: "No summary available.",
      pause: "Pause",
      resume: "Resume",
      runNow: "Run now",
      remove: "Remove",
    },
    validation: {
      rootLabel: "root",
      validationFailed: "Validation failed",
    },
    configSections: {
      saveBar: {
        clean: "All changes saved",
        dirty: "Unsaved changes",
        discard: "Discard",
        save: "Save",
        saving: "Saving...",
      },
      fieldTip: {
        ariaLabel: "Field hint",
        recommendedEn: "Recommended",
        recommendedZh: "Recommended",
        riskEn: "Risk",
        riskZh: "Risk",
      },
      sandbox: {
        title: "Sandbox",
        subtitle: "Choose the sandbox provider and file-access boundary for command execution.",
        mode: "Provider",
        local: "Local provider",
        aio: "AIO provider",
        custom: "Custom provider",
        modeTipEn: "This setting selects the sandbox provider for command execution, not the chat-page Host / Sandbox runtime mode.",
        modeTipZh: "This setting selects the sandbox provider for command execution, not the chat-page Host / Sandbox runtime mode.",
        strictMode: "Strict mode",
        strictModeTipEn:
          "When enabled, the sandbox can access only sandbox files and cannot reach host files. When disabled, it may still read host files but cannot create or modify files on the host. Strict mode applies only to the AIO provider and does not change the chat-page Host mode.",
        strictModeTipZh:
          "When enabled, the sandbox can access only sandbox files and cannot reach host files. When disabled, it may still read host files but cannot create or modify files on the host. Strict mode applies only to the AIO provider and does not change the chat-page Host mode.",
        baseUrl: "Base URL",
        baseUrlPlaceholder: "https://your-sandbox.example.com",
        image: "Image",
        imagePlaceholder: "ghcr.io/...",
        containerPrefix: "Container prefix",
        port: "Port",
        idleTimeout: "Idle timeout (seconds)",
        autoStart: "Auto start",
        aioDefaultsHint:
          "AIO sandbox uses built-in defaults for image/port in most cases. Open Advanced to override.",
        customConfiguredHint: "Custom sandbox endpoint is configured.",
        desktopUnsupportedCurrent: "Current provider is unsupported on desktop",
        desktopUnsupportedTitle: "AIO provider is hidden in desktop settings",
        desktopUnsupportedHint:
          "The current config still points at the AIO provider. Desktop settings no longer expose AIO because the desktop runtime must not depend on Docker, Kubernetes, or the provisioner. Switch to Local or Custom to save a desktop-compatible provider.",
        usePath: "Use path",
        usePathPlaceholder: "nion.community.custom:Provider",
        advanced: "Advanced",
      },
      checkpointer: {
        title: "Thread persistence",
        subtitle: "Configure how chat thread checkpoints are stored.",
        backend: "Backend",
        typeSqlite: "SQLite (Recommended)",
        typeMemory: "Memory",
        backendTipZh:
          "SQLite is recommended for desktop single-user runtime and avoids thread state errors.",
        backendTipEn:
          "SQLite is recommended for desktop single-user runtime and avoids thread state errors.",
        backendRecommended:
          "Use SQLite so thread state survives restarts locally.",
        backendRisk: "Memory loses state after restart.",
        connectionString: "Default path",
        sqlitePlaceholder: "checkpoints.db",
        sqliteHint: "Defaults to the local checkpoints.db file.",
        memoryHint:
          "State lives only in the current process and is lost after restart.",
      },
      tools: {
        title: "Tools",
        subtitle: "Configure built-in tools.",
        customInfoTemplate: "{count} custom tools configured",
        presetTitles: {
          web_search: "Web Search",
          web_fetch: "Web Fetch",
          image_search: "Image Search",
          ls: "List Directory",
          read_file: "Read File",
          write_file: "Write File",
          str_replace: "String Replace",
          bash: "Bash",
        },
        presetDescriptions: {
          web_search: "Allow agent to search the web.",
          web_fetch: "Fetch webpage content.",
          image_search: "Search images for references.",
          ls: "List workspace directory tree.",
          read_file: "Read file content.",
          write_file: "Create or overwrite files.",
          str_replace: "Replace text in files.",
          bash: "Execute shell commands in sandbox.",
        },
      },
      title: {
        title: "Thread title",
        subtitle: "Configure automatic thread title generation.",
        enabled: "Enable title generation",
        model: "Model",
        useDefaultModel: "Use default model",
        maxChars: "Max characters",
        maxWords: "Max words",
        advanced: "Advanced",
      },
      suggestions: {
        title: "Follow-up suggestions",
        subtitle:
          "Configure the model used for follow-up question suggestions.",
        model: "Model",
        useDefaultModel: "Use default model",
        current: "Current: {model}",
      },
      summarization: {
        title: "Summarization",
        subtitle: "Configure automatic summarization behavior.",
        enabled: "Enable summarization",
        model: "Model",
        useDefaultModel: "Use default model",
        triggers: "Triggers",
        noTrigger: "No triggers configured",
        addTrigger: "Add trigger",
        remove: "Remove",
        triggerType: "Trigger type",
        triggerValue: "Trigger value",
        messagesLabel: "Messages",
        tokensLabel: "Tokens",
        fractionLabel: "Fraction",
        keepType: "Keep type",
        keepValue: "Keep value",
        advanced: "Advanced",
      },
      subagents: {
        title: "Subagents",
        subtitle: "Manage per-agent and default timeout policy.",
        hint: "Only listed agents receive explicit timeout overrides.",
        empty: "No subagents configured",
        add: "Add subagent",
        remove: "Remove",
        perAgent: "Per-agent timeout (seconds)",
        defaultTimeout: "Default timeout (seconds)",
      },
      models: {
        providersTitle: "Providers",
        providersSubtitle:
          "Configure provider connections first, then add models from the provider catalog or manually.",
        createProvider: "New Provider",
        providerDetailTitle: "Provider details",
        providerName: "Provider name",
        providerProtocol: "Protocol",
        providerProtocolOpenAI: "OpenAI Compatible",
        providerProtocolAnthropic: "Anthropic Compatible",
        apiKey: "API key / env var",
        apiBase: "API base",
        testModel: "Test model",
        testConnection: "Test Connection",
        refreshCatalog: "Refresh catalog",
        openModelsView: "Open models",
        deleteProvider: "Delete Provider",
        statusConnected: "Connected",
        statusFailed: "Failed",
        statusUntested: "Untested",
        confirmDeleteTitle: "Confirm deletion",
        confirmDeleteAction: "Delete",
        modelsTitle: "Models",
        modelsSubtitle:
          "Manage the runnable model list used by chat and keep the first item as the default model.",
        createModel: "New Model",
        addProviderModel: "Add from catalog",
        addProviderModelDialogTitle: "Add models",
        addProviderModelDialogDesc:
          "Select a provider catalog entry to add it into the runtime model list.",
        modelName: "Display name",
        modelId: "Model ID",
        bindProvider: "Provider",
        internalName: "Internal name",
        maxTokens: "Max output tokens",
        contextWindow: "Context window",
        temperature: "Temperature",
        supportsThinking: "Supports reasoning",
        supportsReasoning: "Supports reasoning effort",
        supportsVision: "Supports vision",
        supportsVideo: "Supports video",
        setDefault: "Set Default",
        default: "Default",
        remove: "Remove",
        inspectModel: "Check Params",
        metadataFilled: "Model parameters were auto-filled.",
        metadataNotFound: "No metadata found for this model.",
        duplicateModelName: "Duplicate internal name",
      },
    },
    modelPage: {
      loadConfigFailed: "Failed to load config",
      createFailed: "Failed to create provider",
      addProvider: "Add provider",
      providerListTitle: "Added providers",
      providerListDescription:
        "Saved provider instances stay pinned here so you can jump straight back into connection or model management.",
      emptyProvidersTitle: "No providers added yet",
      emptyProvidersDescription:
        "Start from the marketplace, add one provider, then finish model setup on the right.",
      categories: {
        domestic: "Domestic",
        aggregator: "Aggregator",
        global: "Global",
        local: "Local",
      },
      marketplaceTitle: "Provider marketplace",
      marketplaceDescription:
        "Pick a built-in provider template or start a custom endpoint. Built-ins hide the technical clutter and only ask for the fields users actually need.",
      emptyMarketplaceTitle: "No templates available",
      emptyMarketplaceDescription:
        "This category does not expose any provider templates in the current runtime yet.",
      addProviderCta: "Open provider",
      alreadyAdded: "Already added",
      globalNoticeLabel: "Network reminder",
      providerDetail: {
        backToMarketplace: "Back to marketplace",
        providerSummary:
          "Configure credentials first, then connect the provider and add runnable models below.",
        credentialsTitle: "Credentials",
        credentialsDescription:
          "Built-in providers inherit their stable metadata from the template. Custom providers will expose the full connection form here in the next step.",
        modelsTitle: "Models under this provider",
        modelsDescription:
          "Once a provider is connected, this list becomes the working runtime catalog for that provider instance.",
        emptyModelsTitle: "No models added yet",
        emptyModelsDescription:
          "Test the provider, discover remote models, or enter a model ID manually to populate this list.",
        customCreateTitle: "Create a custom provider",
        customCreateDescription:
          "Custom providers are for OpenAI-compatible or Anthropic-compatible endpoints that are not part of the built-in marketplace.",
        customCreateAction: "Create custom provider",
      },
      statusLabels: {
        untested: "Untested",
        success: "Healthy",
        failed: "Needs attention",
      },
    },
    toolPage: {
      loadConfigFailed: "Failed to load tool config",
      runtimeTitle: "Tool status",
      runtimeSummary:
        "Shows whether your latest setup is active and whether the tools are ready to use.",
      runtimeStateLabel: "Status",
      runtimeToolsLabel: "Available tools",
      runtimeAttentionLabel: "Needs attention",
      runtimeHealthy: "None",
      runtimeInSync: "Up to date",
      runtimeOutOfSync: "Needs apply",
    },
    automationWorkspace: {
      title: "Automation",
      description:
        "Organize recurring work into clear reminders and scheduled tasks without hunting through settings.",
      tabs: {
        overview: "Overview",
        reminders: "Reminders",
        tasks: "Scheduled tasks",
        events: "Event tasks",
        workflow: "Workflows",
        templates: "Templates",
        governance: "Governance",
        platform: "Open Platform",
        eventCenter: "Event Center",
        history: "History",
      },
      overview: {
        scheduler: "Scheduler",
        schedulerRunning: "Running",
        schedulerIdle: "Idle",
        active: "Active automations",
        runs: "Recorded runs",
        attention: "Needs attention",
        lastSuccess: "Last success",
        nextRun: "Next run",
        notRecordedYet: "Not recorded yet",
      },
      forms: {
        reminderTitle: "New reminder",
        reminderDescription:
          "Create a simple reminder with a name, a prompt, a repeat rule, and a time.",
        taskTitle: "New scheduled task",
        taskDescription:
          "Create a recurring task first, then open advanced options only if you need delivery routing or attached skills.",
        eventTitle: "New event task",
        eventDescription:
          "Create an automation that reacts to a runtime event instead of a clock schedule.",
        creatorTitle: "Create automation",
        creatorDescription:
          "Use one creator for reminders and scheduled tasks, then open advanced options only when needed.",
        creatorKindLabel: "Automation type",
        creatorKinds: {
          reminder: "Reminder",
          task: "Scheduled task",
        },
        cadenceLabel: "Repeats",
        timeLabel: "Time",
        dateTimeLabel: "Date and time",
        dateTimePlaceholder: "Choose a date and time",
        dateTimeHelper: "Pick a date on the left and a time on the right.",
        dateTimeToday: "Today",
        dateTimeClear: "Clear",
        dateTimeConfirm: "Confirm",
        previewLabel: "Quick summary",
        previewDeliveryLabel: "Delivery",
        previewReminderHint: "This reminder will appear on the selected schedule.",
        previewTaskHint: "This task will execute automatically on the selected schedule.",
        previewReminderAdvancedHint:
          "Advanced options can change where the reminder is delivered.",
        previewDeliveryModes: {
          local: "Local notification",
          thread: "Current thread",
          channel: "Channel",
          multi: "Multiple destinations",
        },
        eventTypeLabel: "Event",
        eventActionLabel: "Action",
        eventPromptLabel: "Prompt",
        eventPromptPlaceholder:
          "What should Nion do when this event happens?",
        taskPromptLabel: "Task prompt",
        taskPromptPlaceholder: "What should Nion run on this schedule?",
        intervalLabel: "Interval (minutes)",
        weekdayLabel: "Days of week",
        weekdayOptions: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        customScheduleLabel: "Custom schedule",
        customSchedulePlaceholder: "For example: 0 9 * * 1-5",
        cadenceOptions: {
          once: "Once",
          daily: "Every day",
          weekdays: "Weekdays",
          weekly: "Weekly",
          interval: "Every N minutes",
          custom: "Custom schedule",
        },
        eventOptions: {
          agentRunCompleted: "Agent run completed",
          agentRunFailed: "Agent run failed",
          clarificationRequested: "Need clarification",
          permissionRequested: "Permission requested",
          automationRunFailed: "Automation run failed",
          threadFinished: "Thread finished",
          threadFailed: "Thread failed",
        },
        eventActionOptions: {
          notify: "Notify me",
          playSound: "Play sound",
          notebookWrite: "Write to Notebook",
          agentPrompt: "Run agent prompt",
        },
        createReminder: "Create reminder",
        createTask: "Create scheduled task",
        createEvent: "Create event task",
        advancedOptions: "Advanced options",
      },
      sections: {
        remindersTitle: "Reminders",
        remindersDescription:
          "Lightweight routines and nudges that should stay easy to scan and edit.",
        tasksTitle: "Scheduled tasks",
        tasksDescription:
          "Recurring jobs that may use delivery modes, attached skills, or manual run controls.",
        eventsTitle: "Event tasks",
        eventsDescription:
          "Event-driven rules that react to chat, agent, and automation runtime moments.",
        historyTitle: "Execution history",
        historyDescription:
          "See recent automation runs, outcomes, and timing without digging through raw diagnostics.",
        emptyReminders: "No reminders yet.",
        emptyTasks: "No scheduled tasks yet.",
        emptyEvents: "No event tasks yet.",
        emptyHistory: "No automation runs yet.",
        scheduleLabel: "Schedule",
        nextRunLabel: "Next run",
        lastResultLabel: "Last result",
        actionLabel: "Action",
        summaryLabel: "Summary",
        viewDetails: "View details",
        notScheduled: "Not scheduled",
        noSummary: "No summary yet.",
        startedLabel: "Started",
        finishedLabel: "Finished",
        jobLabel: "Job",
        runningLabel: "Running",
        historyFilters: {
          all: "All",
          failed: "Failed",
          succeeded: "Succeeded",
        },
        dailyPrefix: "Daily at",
        weekdaysPrefix: "Weekdays at",
        weeklyPrefix: "Weekly at",
        oncePrefix: "Once at",
        eventPrefix: "On",
        everyMinutesTemplate: "Every {minutes} min",
      },
    },
    aboutPage: {
      brand: {
        eyebrow: "Personal intelligent work system",
        slogan: "One sentence command, system-level execution.",
        subline:
          "You focus on goals and judgment. Nion handles decomposition, execution, delivery, and optimization.",
        masterClaim:
          "Nion is not just an AI that answers questions. It turns complex work into traceable, verifiable delivery.",
        ctaPrimary: "Start a conversation",
        ctaSecondary: "Explore agent capabilities",
      },
      proofMetrics: {
        orchestrationLabel: "Execution model",
        orchestrationValue: "Multi-agent orchestration",
        orchestrationHint:
          "Task breakdown, parallel progress, incremental delivery",
        memoryLabel: "Context capability",
        memoryValue: "Long-term memory + session policy",
        memoryHint: "Persistent context with controlled temporary isolation",
        channelLabel: "Reach",
        channelValue: "Multi-channel access",
        channelHint: "Lark / DingTalk / Telegram",
      },
      messageHouse: {
        title: "How we move from 'can chat' to 'can deliver'",
        promise: "Turn complex work into a natural conversation.",
        pillars: {
          orchestration: "Multi-agent collaboration",
          memory: "Memory and context",
          ecosystem: "Tools and plugin ecosystem",
          automation: "Automation and channels",
          safety: "Runtime safety",
        },
      },
      capabilitiesTitle: "Capability Overview",
      capabilitiesSubtitle:
        "Each point maps to a real mechanism, not conceptual packaging.",
      capabilities: {
        orchestrationTitle: "Multi-agent collaboration",
        orchestrationValue: "Automatic decomposition of complex goals",
        orchestrationProof:
          "The lead agent can dispatch subagents and toolchains in parallel with traceable progress.",
        memoryTitle: "Memory and context",
        memoryValue: "Long-term preference retention",
        memoryProof:
          "Supports workspace/thread context and OpenViking governance flows.",
        ecosystemTitle: "Tools and plugin ecosystem",
        ecosystemValue: "Extensible and verifiable capability",
        ecosystemProof:
          "Supports SKILL, MCP, Workbench plugins, and plugin test verification loops.",
        automationTitle: "Automation scheduling",
        automationValue: "Time-based + event-driven",
        automationProof:
          "Supports cron / interval / once / event / webhook triggers and multi-step workflows.",
        channelsTitle: "Multi-channel reach",
        channelsValue: "Connect execution to real conversations",
        channelsProof:
          "Provides Lark, DingTalk, and Telegram channel integration with session override controls.",
      },
      trustTitle: "Trust Mechanisms",
      trustSubtitle:
        "Not only capable, but also clear about how execution happens and why it is stable.",
      trust: {
        runtimeTitle: "Controlled runtime boundaries",
        runtimeDescription:
          "Sandbox by default, with controlled host mode in desktop runtime.",
        runtimeProof:
          "Execution mode, workdir, and permission states are visible and diagnosable.",
        memoryTitle: "Clear memory governance",
        memoryDescription:
          "Temporary sessions and long-term memory policies are separated to avoid accidental pollution.",
        memoryProof:
          "Supports query, write, forget, compact, and governance decisions.",
        pluginTitle: "Verifiable plugin quality",
        pluginDescription:
          "Plugins follow a closed loop from generation to auto-check, manual verification, and packaging.",
        pluginProof:
          "Capability declarations, test steps, and reports are auditable.",
        taskTitle: "Traceable execution states",
        taskDescription:
          "Trigger, step execution, and result status are visible end-to-end.",
        taskProof:
          "Supports running, completed, failed, and cancelled lifecycle states.",
      },
      scenariosTitle: "Common user scenarios",
      scenariosSubtitle: "From information to decisions, from intent to delivery.",
      scenarios: {
        infoTitle: "Information processing",
        infoResult: "Finish key daily briefings in 10 minutes",
        infoPath:
          "Ingestion, cleaning, summarization, and recommendations in one flow.",
        writingTitle: "Writing assistant",
        writingResult: "Iterate continuously from outline to final draft",
        writingPath:
          "Generate and refine with audience and style constraints.",
        automationTitle: "Digital workflow automation",
        automationResult: "Turn recurring work into reusable workflows",
        automationPath:
          "Use the scheduler for recurring and event-triggered execution.",
        channelTitle: "Cross-channel response",
        channelResult:
          "Bring system capability into live business communication",
        channelPath:
          "Unified session control with stable cross-platform message handling.",
      },
      ctaTitle: "Ready to hand your next complex task to Nion?",
      ctaDescription:
        "Give the goal. We deliver results through system-level execution.",
      ctaBadge: "Credible and powerful",
      ctaPrimary: "Start now",
      ctaSecondary: "Browse agents",
    },
    acknowledge: {
      emptyTitle: "Acknowledgements",
      emptyDescription: "Credits and acknowledgements will show here.",
    },
  },

  toolPolicyPage: {
    title: "Tool Policy",
    description:
      "Inspect the surface policy applied to the current AppConfig tool set, which is usually driven by Config Center settings for workspace, channel, and automation runs in this V1 lane.",
    scopeTitle: "Scope",
    scopeLabel: "Active catalog scope:",
    scopeUnknown: "Unavailable",
    outOfScopeNotice:
      "This page reflects the current AppConfig tool catalog. Built-in tools, vision-only tools, tool-search, and MCP tools are outside configured-tools-v1 governance.",
    rulesTitle: "Surface rules",
    catalogTitle: "Current AppConfig tool catalog",
    loading: "Loading tool policy…",
    loadFailed: "Failed to load tool policy.",
    emptyRules: "No surface rules are configured.",
    emptyCatalog: "No configured tools are available.",
    yes: "Yes",
    no: "No",
    table: {
      surface: "Surface",
      allowedGroups: "Allowed groups",
      deniedGroups: "Denied groups",
      allowedTools: "Allowed tools",
      deniedTools: "Denied tools",
      empty: "(none)",
    },
    catalogTable: {
      name: "Tool",
      group: "Group",
      source: "Source",
      policyManaged: "Policy managed",
    },
  },
};

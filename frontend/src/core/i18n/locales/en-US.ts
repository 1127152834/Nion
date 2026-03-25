import {
  CompassIcon,
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
    agents: "Agents",
    automation: "Automation",
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
    manageChannels: "Manage channels",
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
  },

  // Page titles (document title)
  pages: {
    appName: "Nion",
    chats: "Chats",
    newChat: "New chat",
    untitled: "Untitled",
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
      mcpServers: "MCP servers",
      skills: "Skills",
      sandbox: "Sandbox",
      channels: "Channels",
      notification: "Notification",
      daemon: "Daemon",
      about: "About",
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
      recall: {
        title: "Recall",
        description:
          "Search transcript recall separately from structured memory.",
        placeholder: "Search transcript recall",
        searchButton: "Search",
        idle: "Enter a query to search transcript recall.",
        empty: "No recall results found.",
        loadFailed: "Failed to load recall results.",
        threadLabel: "Thread",
        agentLabel: "Agent",
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
    channels: {
      title: "Channels",
      description:
        "Connect chat apps and manage who can use Nion through them.",
      workspace: {
        title: "This App",
        description:
          "Channel authorization applies to this Nion app.",
      },
      platforms: {
        lark: "Lark",
        dingtalk: "DingTalk",
        telegram: "Telegram",
      },
      configuration: {
        title: "Channel Configuration",
        description:
          "Add the connection details, confirm connectivity, then finish setup for users from the same page.",
      },
      labels: {
        enabled: "Enabled",
        disabled: "Disabled",
        accessMode: "Access Mode",
        required: "Required",
        optional: "Optional",
        loading: "Loading...",
        requestedAt: "Requested at",
        grantedAt: "Granted at",
        unknownTime: "Unknown time",
      },
      modes: {
        webhook: "Webhook (HTTP callback)",
        stream: "Stream (persistent connection)",
      },
      proxyModes: {
        auto: "auto (adaptive)",
        direct: "direct (no proxy)",
        system: "system (system proxy)",
      },
      fields: {
        appId: "App ID",
        appSecret: "App Secret",
        verificationToken: "Verification Token",
        encryptKey: "Encrypt Key",
        clientId: "Client ID",
        clientSecret: "Client Secret",
        robotCode: "Robot Code",
        proxyMode: "Proxy Mode",
        webhookUrl: "Webhook URL",
        signingSecret: "Signing Secret",
        botToken: "Bot Token",
        allowedUsers: "Allowed Users",
        secretToken: "Secret Token",
      },
      hints: {
        pairingGuide:
          "The channel is reachable. Ask the user to send any message, then approve the request below.",
        larkVerificationToken: "Required for webhook challenge verification.",
        larkEncryptKey: "Optional encryption key for Lark event payloads.",
        dingtalkRobotCode: "Required when DingTalk stream mode uses robot-code routing.",
        dingtalkProxyMode: "Controls how the runtime resolves outbound network access.",
        dingtalkWebhookUrl: "Webhook URL issued by DingTalk for callback mode.",
      },
      actions: {
        setupDocs: "Setup Docs",
        testConnection: "Test Connection",
        saveAndApply: "Save & Apply",
        goToPairing: "Go to Pairing & Authorization",
        refresh: "Refresh",
        approve: "Approve",
        reject: "Reject",
        revoke: "Revoke",
        cancel: "Cancel",
      },
      runtime: {
        statusTitle: "Runtime Status",
        statusDescription:
          "See whether this channel is online, connected, and if anything needs attention.",
        activeUsersLabel: "Active users",
        runningLabel: "Running",
        stoppedLabel: "Stopped",
        connectedLabel: "Connected",
        disconnectedLabel: "Disconnected",
        connectionFailedLabel: "Connection failed",
        noStatus: "No runtime status",
      },
      pairing: {
        sectionTitle: "User Connections",
        sectionDescription:
          "Create a temporary code, review incoming requests, and manage connected users.",
        code: {
          title: "Connect Code",
          description:
            "Ask the user to send any message first. If needed, `/pair 123456` is available as a manual fallback.",
          expireMinutes: "minutes to expire",
          generateAction: "Generate",
          activeCode: "Active connect code",
          noCodeGenerated: "No connect code generated",
          copiedToast: "Connect command copied",
          generatedToast: "Connect code generated: {code}",
          generateFailed: "Failed to generate connect code",
          expiresAtPrefix: "Expires at",
          slotHint: "A 6-digit connect code will be shown here after generation",
        },
        pending: {
          title: "Pending Connection Requests",
          empty: "No pending connection requests",
          approvedToast: "Connection approved",
          rejectedToast: "Rejected",
        },
      },
      authorization: {
        title: "Connected Users",
        empty: "No connected users",
        sessionOverrideBadge: "Session Override",
        sessionOverrideAction: "Session Override",
        revokeConfirmTemplate:
          'Remove the channel connection for "{name}"? They will need to connect again later.',
        revokedToast: "Connection removed",
      },
      session: {
        defaultsTitle: "Session Defaults",
        defaultsDescription:
          "Set default session options for this channel. Leave fields empty to keep the app defaults.",
        assistantIdLabel: "Assistant ID",
        assistantIdPlaceholder: "Leave empty to inherit",
        recursionLimitLabel: "Recursion Limit",
        recursionLimitPlaceholder: "Leave empty to inherit",
        thinkingLabel: "Thinking",
        planModeLabel: "Plan Mode",
        subagentLabel: "Subagent",
        inheritOption: "Inherit",
        enabledOption: "Enabled",
        disabledOption: "Disabled",
        inheritLabel: "Inherit current defaults",
        overrideDialogTitle: "Edit Session Override",
        overrideDialogDescription:
          "Configure higher-priority session parameters for an authorized user. Leave empty or choose inherit to fall back to channel defaults.",
        overrideCurrentLabel: "Current override",
        resetAction: "Reset to inherit",
        savedToast: "Session override saved",
      },
      conversationTypes: {
        conversation: "Conversation",
        group: "Group",
        direct: "Direct",
      },
      errors: {
        fillRequiredFieldsFirst: "Please fill required fields first: {fields}",
        fillConnectionFieldsFirst:
          "Please fill required fields for connection test: {fields}",
        saveConfigFailed: "Failed to save configuration",
        connectionTestFailed: "Connection test failed",
        platformConfigSaved: "{platform} configuration saved",
        platformConnectionSuccess: "{platform} connection test succeeded",
        missingRequiredFieldsPrefix: "Missing required fields for current mode: ",
        approveFailed: "Approve failed",
        rejectFailed: "Reject failed",
        revokeFailed: "Revoke failed",
        sessionOverrideSaveFailed: "Failed to save session override",
      },
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
        followCurrent: "Follow current chat model (default)",
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
        notRecordedYet: "Not recorded yet",
      },
      forms: {
        reminderTitle: "New reminder",
        reminderDescription:
          "Create a simple reminder with a name, a prompt, a repeat rule, and a time.",
        taskTitle: "New scheduled task",
        taskDescription:
          "Create a recurring task first, then open advanced options only if you need delivery routing or attached skills.",
        cadenceLabel: "Repeats",
        timeLabel: "Time",
        cadenceOptions: {
          daily: "Every day",
          weekdays: "Weekdays",
          weekly: "Weekly",
        },
        createReminder: "Create reminder",
        createTask: "Create scheduled task",
        advancedOptions: "Advanced options",
      },
      sections: {
        remindersTitle: "Reminders",
        remindersDescription:
          "Lightweight routines and nudges that should stay easy to scan and edit.",
        tasksTitle: "Scheduled tasks",
        tasksDescription:
          "Recurring jobs that may use delivery modes, attached skills, or manual run controls.",
        historyTitle: "Execution history",
        historyDescription:
          "See recent automation runs, outcomes, and timing without digging through raw diagnostics.",
        emptyReminders: "No reminders yet.",
        emptyTasks: "No scheduled tasks yet.",
        emptyHistory: "No automation runs yet.",
        scheduleLabel: "Schedule",
        nextRunLabel: "Next run",
        lastResultLabel: "Last result",
        notScheduled: "Not scheduled",
        noSummary: "No summary yet.",
        startedLabel: "Started",
        finishedLabel: "Finished",
        jobLabel: "Job",
        runningLabel: "Running",
        dailyPrefix: "Daily at",
        weekdaysPrefix: "Weekdays at",
        weeklyPrefix: "Weekly at",
        oncePrefix: "Once at",
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

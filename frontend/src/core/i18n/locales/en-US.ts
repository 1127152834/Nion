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
      knowledge: "Knowledge & Memory",
      capabilities: "Tools & Skills",
    },
    sections: {
      appearance: "Appearance",
      memory: "Memory",
      tools: "Tools",
      skills: "Skills",
      notification: "Notification",
      about: "About",
    },
    memory: {
      title: "Memory",
      description:
        "Nion automatically learns from your conversations in the background. These memories help Nion understand you better and deliver a more personalized experience.",
      empty: "No memory data to display.",
      rawJson: "Raw JSON",
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
    tools: {
      title: "Tools",
      description: "Manage the configuration and enabled status of MCP tools.",
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
};

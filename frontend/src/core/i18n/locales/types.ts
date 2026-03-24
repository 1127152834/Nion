import type { LucideIcon } from "lucide-react";

export interface Translations {
  // Locale meta
  locale: {
    localName: string;
  };

  // Common
  common: {
    home: string;
    settings: string;
    delete: string;
    rename: string;
    share: string;
    openInNewWindow: string;
    close: string;
    more: string;
    search: string;
    download: string;
    thinking: string;
    artifacts: string;
    workingDirectory: string;
    browseWorkspace: string;
    public: string;
    custom: string;
    notAvailableInDemoMode: string;
    loading: string;
    version: string;
    lastUpdated: string;
    code: string;
    preview: string;
    cancel: string;
    save: string;
    install: string;
    create: string;
    export: string;
    exportAsMarkdown: string;
    exportAsJSON: string;
    exportSuccess: string;
  };

  // Welcome
  welcome: {
    greeting: string;
    description: string;
    createYourOwnSkill: string;
    createYourOwnSkillDescription: string;
  };

  // Clipboard
  clipboard: {
    copyToClipboard: string;
    copiedToClipboard: string;
    failedToCopyToClipboard: string;
    linkCopied: string;
  };

  // Input Box
  inputBox: {
    placeholder: string;
    createSkillPrompt: string;
    addAttachments: string;
    mode: string;
    flashMode: string;
    flashModeDescription: string;
    reasoningMode: string;
    reasoningModeDescription: string;
    proMode: string;
    proModeDescription: string;
    ultraMode: string;
    ultraModeDescription: string;
    reasoningEffort: string;
    reasoningEffortMinimal: string;
    reasoningEffortMinimalDescription: string;
    reasoningEffortLow: string;
    reasoningEffortLowDescription: string;
    reasoningEffortMedium: string;
    reasoningEffortMediumDescription: string;
    reasoningEffortHigh: string;
    reasoningEffortHighDescription: string;
    searchModels: string;
    surpriseMe: string;
    surpriseMePrompt: string;
    followupLoading: string;
    followupConfirmTitle: string;
    followupConfirmDescription: string;
    followupConfirmAppend: string;
    followupConfirmReplace: string;
    suggestions: {
      suggestion: string;
      prompt: string;
      icon: LucideIcon;
    }[];
    suggestionsCreate: (
      | {
          suggestion: string;
          prompt: string;
          icon: LucideIcon;
        }
      | {
          type: "separator";
        }
    )[];
  };

  // Sidebar
  sidebar: {
    recentChats: string;
    newChat: string;
    chats: string;
    demoChats: string;
    agents: string;
  };

  // Agents
  agents: {
    title: string;
    description: string;
    newAgent: string;
    emptyTitle: string;
    emptyDescription: string;
    chat: string;
    delete: string;
    deleteConfirm: string;
    deleteSuccess: string;
    newChat: string;
    createPageTitle: string;
    createPageSubtitle: string;
    nameStepTitle: string;
    nameStepHint: string;
    nameStepPlaceholder: string;
    nameStepContinue: string;
    nameStepInvalidError: string;
    nameStepAlreadyExistsError: string;
    nameStepCheckError: string;
    nameStepBootstrapMessage: string;
    agentCreated: string;
    startChatting: string;
    backToGallery: string;
  };

  // Breadcrumb
  breadcrumb: {
    workspace: string;
    chats: string;
  };

  // Workspace
  workspace: {
    officialWebsite: string;
    githubTooltip: string;
    settingsAndMore: string;
    visitGithub: string;
    reportIssue: string;
    contactUs: string;
    about: string;
    manageChannels: string;
    singleWorkspaceLabel: string;
    singleWorkspacePath: string;
    singleWorkspaceHint: string;
    runtimeMode: {
      sandboxLabel: string;
      hostLabel: string;
      sandboxTip: string;
      hostTip: string;
      hostBoundDirectory: string;
      locked: string;
      lockedTip: string;
      modeSaveFailed: string;
    };
  };

  channelOps: {
    title: string;
    description: string;
    loading: string;
    errorState: string;
    serviceDown: string;
    summary: {
      service: string;
      running: string;
      down: string;
      pending: string;
      channels: string;
    };
    badges: {
      enabled: string;
      disabled: string;
      running: string;
      stopped: string;
    };
    capabilities: {
      streaming: string;
      nonStreaming: string;
    };
    fields: {
      lastHeartbeat: string;
      lastError: string;
      authorizedUsers: string;
      pendingRequests: string;
      none: string;
    };
    restart: {
      action: string;
      inProgress: string;
    };
  };

  // Conversation
  conversation: {
    noMessages: string;
    startConversation: string;
  };

  // Chats
  chats: {
    searchChats: string;
  };

  // Page titles (document title)
  pages: {
    appName: string;
    chats: string;
    newChat: string;
    untitled: string;
  };

  // Tool calls
  toolCalls: {
    moreSteps: (count: number) => string;
    lessSteps: string;
    executeCommand: string;
    presentFiles: string;
    needYourHelp: string;
    useTool: (toolName: string) => string;
    searchForRelatedInfo: string;
    searchForRelatedImages: string;
    searchFor: (query: string) => string;
    searchForRelatedImagesFor: (query: string) => string;
    searchOnWebFor: (query: string) => string;
    viewWebPage: string;
    listFolder: string;
    readFile: string;
    writeFile: string;
    clickToViewContent: string;
    writeTodos: string;
    skillInstallTooltip: string;
  };

  // Uploads
  uploads: {
    uploading: string;
    uploadingFiles: string;
  };

  // Subtasks
  subtasks: {
    subtask: string;
    executing: (count: number) => string;
    in_progress: string;
    completed: string;
    failed: string;
  };

  // Shortcuts
  shortcuts: {
    searchActions: string;
    noResults: string;
    actions: string;
    keyboardShortcuts: string;
    keyboardShortcutsDescription: string;
    openCommandPalette: string;
    toggleSidebar: string;
  };

  // Settings
  settings: {
    title: string;
    description: string;
    loadingState: string;
    configCenterError: string;
    navGroups: {
      experience: string;
      conversation: string;
      knowledge: string;
      capabilities: string;
      system: string;
    };
    sections: {
      appearance: string;
      models: string;
      sessionPolicy: string;
      memory: string;
      automation: string;
      tools: string;
      mcpServers: string;
      skills: string;
      sandbox: string;
      notification: string;
      about: string;
    };
    memory: {
      title: string;
      description: string;
      empty: string;
      rawJson: string;
      markdown: {
        overview: string;
        userContext: string;
        work: string;
        personal: string;
        topOfMind: string;
        historyBackground: string;
        recentMonths: string;
        earlierContext: string;
        longTermBackground: string;
        updatedAt: string;
        facts: string;
        empty: string;
        table: {
          category: string;
          confidence: string;
          confidenceLevel: {
            veryHigh: string;
            high: string;
            normal: string;
            unknown: string;
          };
          content: string;
          source: string;
          createdAt: string;
          view: string;
        };
      };
    };
    appearance: {
      themeTitle: string;
      themeDescription: string;
      system: string;
      light: string;
      dark: string;
      systemDescription: string;
      lightDescription: string;
      darkDescription: string;
      languageTitle: string;
      languageDescription: string;
    };
    models: {
      title: string;
      description: string;
    };
    sessionPolicy: {
      title: string;
      description: string;
    };
    tools: {
      title: string;
      description: string;
    };
    mcpServers: {
      title: string;
      description: string;
    };
    sandbox: {
      title: string;
      description: string;
    };
    skills: {
      title: string;
      description: string;
      createSkill: string;
      emptyTitle: string;
      emptyDescription: string;
      emptyButton: string;
    };
    skillImportDialog: {
      title: string;
      description: string;
      threadId: string;
      threadIdPlaceholder: string;
      path: string;
      pathPlaceholder: string;
      install: string;
      installing: string;
      close: string;
      success: string;
    };
    skillPage: {
      createViaChat: string;
      importFromAgents: string;
      skillDeleted: string;
      deleteFailed: string;
      deleteConfirmTitle: string;
      deleteConfirmDescription: string;
      cancelAction: string;
      confirmDeleteAction: string;
    };
    notification: {
      title: string;
      description: string;
      requestPermission: string;
      deniedHint: string;
      testButton: string;
      testTitle: string;
      testBody: string;
      notSupported: string;
      disableNotification: string;
    };
    automation: {
      title: string;
      description: string;
      scheduler: string;
      schedulerRunning: string;
      schedulerIdle: string;
      jobs: string;
      runs: string;
      diagnostics: string;
      failedRuns: string;
      lastTick: string;
      notRecordedYet: string;
      futureHooks: string;
      futureHookLabels: {
        openvikingArchive: string;
        relationshipAwareRoutines: string;
        selfGrowthSuggestions: string;
      };
      createJobTitle: string;
      createJobDescription: string;
      create: string;
      nameLabel: string;
      namePlaceholder: string;
      deliveryModeLabel: string;
      deliveryModes: {
        local: string;
        thread: string;
        channel: string;
        multi: string;
      };
      promptLabel: string;
      promptPlaceholder: string;
      scheduleKindLabel: string;
      scheduleKinds: {
        once: string;
        interval: string;
        cron: string;
      };
      scheduleValueLabel: string;
      scheduleHelp: {
        once: string;
        interval: string;
        cron: string;
      };
      attachedSkillsLabel: string;
      attachedSkillsPlaceholder: string;
      jobsTitle: string;
      jobsDescription: string;
      emptyJobs: string;
      recentRunsTitle: string;
      recentRunsDescription: string;
      emptyRuns: string;
      stateLabels: {
        scheduled: string;
        paused: string;
        error: string;
        succeeded: string;
        failed: string;
      };
      schedulePrefix: string;
      deliveryPrefix: string;
      nextRunPrefix: string;
      notScheduled: string;
      lastResult: string;
      noSummary: string;
      pause: string;
      resume: string;
      runNow: string;
      remove: string;
    };
    validation: {
      rootLabel: string;
      validationFailed: string;
    };
    configSections: {
      saveBar: {
        clean: string;
        dirty: string;
        discard: string;
        save: string;
        saving: string;
      };
      fieldTip?: Record<string, string>;
      tools: {
        title: string;
        subtitle: string;
        customInfoTemplate: string;
        presetTitles: Record<string, string>;
        presetDescriptions: Record<string, string>;
      };
      sandbox: Record<string, string>;
      checkpointer: Record<string, string>;
      title: Record<string, string>;
      suggestions: Record<string, string>;
      summarization: Record<string, string>;
      subagents: Record<string, string>;
      models: Record<string, string>;
    };
    modelPage: {
      providersLabel: string;
      providersSubtitle: string;
      modelsLabel: string;
      modelsSubtitle: string;
      defaultModelLabel: string;
      helperText: string;
      notSet: string;
      unnamedModel: string;
      loadConfigFailed: string;
    };
    toolPage: {
      builtInTitle: string;
      builtInDesc: string;
      loadConfigFailed: string;
      runtimeTitle: string;
      runtimeSource: string;
      runtimeVersion: string;
      runtimeInSync: string;
      runtimeOutOfSync: string;
      runtimeWarnings: string;
      runtimeProcesses: string;
    };
    aboutPage: {
      brand: {
        eyebrow: string;
        slogan: string;
        subline: string;
        masterClaim: string;
        ctaPrimary: string;
        ctaSecondary: string;
      };
      proofMetrics: {
        orchestrationLabel: string;
        orchestrationValue: string;
        orchestrationHint: string;
        memoryLabel: string;
        memoryValue: string;
        memoryHint: string;
        channelLabel: string;
        channelValue: string;
        channelHint: string;
      };
      messageHouse: {
        title: string;
        promise: string;
        pillars: {
          orchestration: string;
          memory: string;
          ecosystem: string;
          automation: string;
          safety: string;
        };
      };
      capabilitiesTitle: string;
      capabilitiesSubtitle: string;
      capabilities: {
        orchestrationTitle: string;
        orchestrationValue: string;
        orchestrationProof: string;
        memoryTitle: string;
        memoryValue: string;
        memoryProof: string;
        ecosystemTitle: string;
        ecosystemValue: string;
        ecosystemProof: string;
        automationTitle: string;
        automationValue: string;
        automationProof: string;
        channelsTitle: string;
        channelsValue: string;
        channelsProof: string;
      };
      trustTitle: string;
      trustSubtitle: string;
      trust: {
        runtimeTitle: string;
        runtimeDescription: string;
        runtimeProof: string;
        memoryTitle: string;
        memoryDescription: string;
        memoryProof: string;
        pluginTitle: string;
        pluginDescription: string;
        pluginProof: string;
        taskTitle: string;
        taskDescription: string;
        taskProof: string;
      };
      scenariosTitle: string;
      scenariosSubtitle: string;
      scenarios: {
        infoTitle: string;
        infoResult: string;
        infoPath: string;
        writingTitle: string;
        writingResult: string;
        writingPath: string;
        automationTitle: string;
        automationResult: string;
        automationPath: string;
        channelTitle: string;
        channelResult: string;
        channelPath: string;
      };
      ctaTitle: string;
      ctaDescription: string;
      ctaBadge: string;
      ctaPrimary: string;
      ctaSecondary: string;
    };
    acknowledge: {
      emptyTitle: string;
      emptyDescription: string;
    };
  };
}

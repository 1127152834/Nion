import type { LucideIcon } from "lucide-react";

type SettingsSearchTranslations = {
  title: string;
  description: string;
  loadConfigFailed: string;
  capabilityHint: string;
  unsupportedProviderPrefix: string;
  unsupportedProviderHint: string;
  providerTitle: string;
  providerPlaceholder: string;
  enableLabel: string;
  docsAction: string;
  supportedBadge: string;
  unsupportedBadge: string;
  noProviderFields: string;
  capabilities: {
    web_search: {
      title: string;
      description: string;
    };
    web_fetch: {
      title: string;
      description: string;
    };
    image_search: {
      title: string;
      description: string;
    };
  };
  fields: {
    apiKey: {
      label: string;
      placeholder: string;
    };
    maxResults: {
      label: string;
      placeholder: string;
    };
    timeout: {
      label: string;
      placeholder: string;
    };
  };
  providers: {
    tavily: {
      label: string;
      webSearchTitle: string;
      webSearchDescription: string;
      webFetchTitle: string;
      webFetchDescription: string;
    };
    firecrawl: {
      label: string;
      webSearchTitle: string;
      webSearchDescription: string;
      webFetchTitle: string;
      webFetchDescription: string;
    };
    jina_ai: {
      label: string;
      webFetchTitle: string;
      webFetchDescription: string;
    };
    duckduckgo: {
      label: string;
      imageSearchTitle: string;
      imageSearchDescription: string;
    };
  };
};

type SettingsCliToolsTranslations = {
  title: string;
  description: string;
  runtime: {
    hint: string;
  };
  empty: string;
  states: {
    enabled: string;
    disabled: string;
    installed: string;
    missing: string;
    configured: string;
  };
  sources: {
    hostDetected: string;
  };
  labels: {
    path: string;
    source: string;
  };
  hints: {
    composer: string;
  };
  defaults: {
    python3: string;
    node: string;
    git: string;
    pnpm: string;
    uv: string;
    generic: string;
  };
  errors: {
    loadFailed: string;
    saveFailed: string;
  };
};

type SettingsChannelsTranslations = {
  title: string;
  description: string;
  workspace: {
    title: string;
    description: string;
  };
  platforms: {
    lark: string;
    dingtalk: string;
    telegram: string;
  };
  configuration: {
    title: string;
    description: string;
  };
  labels: {
    enabled: string;
    disabled: string;
    accessMode: string;
    required: string;
    optional: string;
    loading: string;
    requestedAt: string;
    grantedAt: string;
    unknownTime: string;
  };
  modes: {
    webhook: string;
    stream: string;
  };
  proxyModes: {
    auto: string;
    direct: string;
    system: string;
  };
  fields: {
    appId: string;
    appSecret: string;
    verificationToken: string;
    encryptKey: string;
    clientId: string;
    clientSecret: string;
    robotCode: string;
    proxyMode: string;
    webhookUrl: string;
    signingSecret: string;
    botToken: string;
    allowedUsers: string;
    secretToken: string;
  };
  hints: {
    pairingGuide: string;
    larkVerificationToken: string;
    larkEncryptKey: string;
    dingtalkRobotCode: string;
    dingtalkProxyMode: string;
    dingtalkWebhookUrl: string;
  };
  actions: {
    setupDocs: string;
    testConnection: string;
    saveAndApply: string;
    goToPairing: string;
    refresh: string;
    approve: string;
    reject: string;
    revoke: string;
    cancel: string;
  };
  runtime: {
    statusTitle: string;
    statusDescription: string;
    activeUsersLabel: string;
    runningLabel: string;
    stoppedLabel: string;
    connectedLabel: string;
    disconnectedLabel: string;
    connectionFailedLabel: string;
    noStatus: string;
  };
  pairing: {
    sectionTitle: string;
    sectionDescription: string;
    code: {
      title: string;
      description: string;
      expireMinutes: string;
      generateAction: string;
      activeCode: string;
      noCodeGenerated: string;
      copiedToast: string;
      generatedToast: string;
      generateFailed: string;
      expiresAtPrefix: string;
      slotHint: string;
    };
    pending: {
      title: string;
      empty: string;
      approvedToast: string;
      rejectedToast: string;
    };
  };
  authorization: {
    title: string;
    empty: string;
    sessionOverrideBadge: string;
    sessionOverrideAction: string;
    revokeConfirmTemplate: string;
    revokedToast: string;
  };
  session: {
    defaultsTitle: string;
    defaultsDescription: string;
    assistantIdLabel: string;
    assistantIdPlaceholder: string;
    recursionLimitLabel: string;
    recursionLimitPlaceholder: string;
    thinkingLabel: string;
    planModeLabel: string;
    subagentLabel: string;
    inheritOption: string;
    enabledOption: string;
    disabledOption: string;
    inheritLabel: string;
    overrideDialogTitle: string;
    overrideDialogDescription: string;
    overrideCurrentLabel: string;
    resetAction: string;
    savedToast: string;
  };
  conversationTypes: {
    conversation: string;
    group: string;
    direct: string;
  };
  errors: {
    fillRequiredFieldsFirst: string;
    fillConnectionFieldsFirst: string;
    saveConfigFailed: string;
    connectionTestFailed: string;
    platformConfigSaved: string;
    platformConnectionSuccess: string;
    missingRequiredFieldsPrefix: string;
    approveFailed: string;
    rejectFailed: string;
    revokeFailed: string;
    sessionOverrideSaveFailed: string;
  };
};

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
    automation: string;
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
    requestError: {
      title: string;
      modelUnavailable: string;
      authenticationFailed: string;
      runtimeUnavailable: string;
      generic: string;
      detailsLabel: string;
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
      search: string;
      cliTools: string;
      mcpServers: string;
      skills: string;
      sandbox: string;
      channels: string;
      notification: string;
      daemon: string;
      about: string;
    };
    daemon: {
      title: string;
      description: string;
      allowBackgroundRunningLabel: string;
      allowBackgroundRunningHint: string;
    };
    memory: {
      title: string;
      description: string;
      empty: string;
      rawJson: string;
      recall: {
        title: string;
        description: string;
        placeholder: string;
        searchButton: string;
        idle: string;
        empty: string;
        loadFailed: string;
        threadLabel: string;
        agentLabel: string;
      };
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
    search: SettingsSearchTranslations;
    cliTools: SettingsCliToolsTranslations;
    mcpServers: {
      title: string;
      description: string;
    };
    sandbox: {
      title: string;
      description: string;
    };
    channels: SettingsChannelsTranslations;
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
      loadConfigFailed: string;
      runtimeTitle: string;
      runtimeSummary: string;
      runtimeStateLabel: string;
      runtimeToolsLabel: string;
      runtimeAttentionLabel: string;
      runtimeHealthy: string;
      runtimeInSync: string;
      runtimeOutOfSync: string;
    };
    automationWorkspace: {
      title: string;
      description: string;
      tabs: {
        overview: string;
        reminders: string;
        tasks: string;
        history: string;
      };
      overview: {
        scheduler: string;
        schedulerRunning: string;
        schedulerIdle: string;
        active: string;
        runs: string;
        attention: string;
        lastSuccess: string;
        notRecordedYet: string;
      };
      forms: {
        reminderTitle: string;
        reminderDescription: string;
        taskTitle: string;
        taskDescription: string;
        cadenceLabel: string;
        timeLabel: string;
        cadenceOptions: {
          daily: string;
          weekdays: string;
          weekly: string;
        };
        createReminder: string;
        createTask: string;
        advancedOptions: string;
      };
      sections: {
        remindersTitle: string;
        remindersDescription: string;
        tasksTitle: string;
        tasksDescription: string;
        historyTitle: string;
        historyDescription: string;
        emptyReminders: string;
        emptyTasks: string;
        emptyHistory: string;
        scheduleLabel: string;
        nextRunLabel: string;
        lastResultLabel: string;
        notScheduled: string;
        noSummary: string;
        startedLabel: string;
        finishedLabel: string;
        jobLabel: string;
        runningLabel: string;
        dailyPrefix: string;
        weekdaysPrefix: string;
        weeklyPrefix: string;
        oncePrefix: string;
        everyMinutesTemplate: string;
      };
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

  toolPolicyPage: {
    title: string;
    description: string;
    scopeTitle: string;
    scopeLabel: string;
    scopeUnknown: string;
    outOfScopeNotice: string;
    rulesTitle: string;
    catalogTitle: string;
    loading: string;
    loadFailed: string;
    emptyRules: string;
    emptyCatalog: string;
    yes: string;
    no: string;
    table: {
      surface: string;
      allowedGroups: string;
      deniedGroups: string;
      allowedTools: string;
      deniedTools: string;
      empty: string;
    };
    catalogTable: {
      name: string;
      group: string;
      source: string;
      policyManaged: string;
    };
  };
}

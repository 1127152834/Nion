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

type BridgeTranslations = {
  menuLabel: string;
  desktopOnly: string;
  nav: {
    overview: string;
    diagnostics: string;
    telegram: string;
    feishu: string;
    discord: string;
    qq: string;
    weixin: string;
  };
  overview: {
    title: string;
    description: string;
    enableTitle: string;
    enableDescription: string;
    autoStartTitle: string;
    autoStartDescription: string;
    statusTitle: string;
    statusDescription: string;
    runtimeLabel: string;
    running: string;
    stopped: string;
    enabledPlatformsLabel: string;
    activePlatformsLabel: string;
    currentBindingsTitle: string;
    currentBindingsDescription: string;
    noBindings: string;
    platformLabel: string;
    chatLabel: string;
    threadLabel: string;
    workingDirectoryLabel: string;
    defaultWorkspaceTitle: string;
    defaultWorkspaceDescription: string;
    workingDirectoryTitle: string;
    defaultModelTitle: string;
    defaultProviderTitle: string;
    channelsTitle: string;
    channelsDescription: string;
    saveDefaultsAction: string;
    startAction: string;
    stopAction: string;
  };
  diagnostics: {
    title: string;
    description: string;
    diagnoseAction: string;
    empty: string;
    selectIncident: string;
    hypothesisLabel: string;
    recommendedActionsTitle: string;
    noActions: string;
    confirmRunAction: string;
    dismissAction: string;
    advisoryOnly: string;
    lastActionResultTitle: string;
    confirmRunPrompt: string;
  };
  telegram: {
    title: string;
    description: string;
    saveAction: string;
    testAction: string;
    botTokenPlaceholder: string;
    chatIdPlaceholder: string;
    allowedUsersPlaceholder: string;
  };
  feishu: {
    title: string;
    description: string;
    saveAction: string;
    testAction: string;
    appIdPlaceholder: string;
    appSecretPlaceholder: string;
    allowFromPlaceholder: string;
    groupAllowFromPlaceholder: string;
    domainFeishu: string;
    domainLark: string;
    dmPolicyOpen: string;
    dmPolicyPairing: string;
    dmPolicyAllowlist: string;
    dmPolicyDisabled: string;
    groupPolicyOpen: string;
    groupPolicyAllowlist: string;
    groupPolicyDisabled: string;
    threadSession: string;
    requireMention: string;
  };
  discord: {
    title: string;
    description: string;
    saveAction: string;
    testAction: string;
    botTokenPlaceholder: string;
    allowedUsersPlaceholder: string;
    allowedChannelsPlaceholder: string;
    allowedGuildsPlaceholder: string;
    groupPolicyOpen: string;
    groupPolicyDisabled: string;
    requireMention: string;
    streamPreview: string;
    maxAttachmentPlaceholder: string;
    imageHandling: string;
  };
  qq: {
    title: string;
    description: string;
    saveAction: string;
    testAction: string;
    appIdPlaceholder: string;
    appSecretPlaceholder: string;
    allowedUsersPlaceholder: string;
    imageHandling: string;
    maxImageSizePlaceholder: string;
  };
  weixin: {
    title: string;
    description: string;
    accounts: string;
    accountsDesc: string;
    addAccount: string;
    qrLogin: string;
    qrWaiting: string;
    qrScanned: string;
    qrConfirmed: string;
    qrExpired: string;
    qrFailed: string;
    currentBindings: string;
    noAccounts: string;
    accountActive: string;
    accountPaused: string;
    accountExpired: string;
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
    select: string;
    selectAll: string;
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
    clarificationPlaceholder: string;
    clarificationReplying: string;
    clarificationHelper: string;
    clarificationChooseOption: string;
    clarificationSubmitChoice: string;
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
          action?: "create-project";
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
    pendingReply: string;
    agents: string;
    projects: string;
    automation: string;
    cliTools: string;
    notebook: string;
    memory: string;
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
    builtinBadge: string;
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
    navigationMenu: string;
    visitGithub: string;
    reportIssue: string;
    contactUs: string;
    about: string;
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

  workspaceSurfaces: {
    memory: {
      eyebrow: string;
      title: string;
      description: string;
      consoleTitle: string;
      consoleDescription: string;
      recallTitle: string;
      recallDescription: string;
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
    selectedCount: string;
  };

  bridge: BridgeTranslations;

  // Page titles (document title)
  pages: {
    appName: string;
    chats: string;
    newChat: string;
    notebook: string;
    untitled: string;
  };

  notebookPage: {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    createNote: string;
    createFolder: string;
    createNoteHere: string;
    createSubfolder: string;
    renameFolder: string;
    deleteFolder: string;
    confirmCreateFolder: string;
    confirmRenameFolder: string;
    confirmDeleteFolder: string;
    deleteFolderDescription: string;
    folderNameLabel: string;
    folderNamePlaceholder: string;
    folderSaveToPrefix: string;
    rootFolderLabel: string;
    noteTitlePlaceholder: string;
    noteDirectoryPlaceholder: string;
    saveToLabel: string;
    inboxLabel: string;
    selectFolderPlaceholder: string;
    folderPickerEmpty: string;
    save: string;
    confirmSaveDraft: string;
    saving: string;
    saved: string;
    unsaved: string;
    saveDraft: string;
    draftMetaLabel: string;
    draftDirectoryPending: string;
    untitledDraftTitle: string;
    rename: string;
    move: string;
    history: string;
    restore: string;
    delete: string;
    selectNote: string;
    noSelectionTitle: string;
    noSelectionDescription: string;
    noteListTitle: string;
    noteListDescription: string;
    historyTitle: string;
    historyDescription: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    deleteConfirmAction: string;
    movePlaceholder: string;
    renamePlaceholder: string;
    createDialogTitle: string;
    createDialogDescription: string;
    assistTitle: string;
    assistDescription: string;
    assistSummarize: string;
    assistRewrite: string;
    assistExpand: string;
    assistChecklist: string;
    assistActionItems: string;
    quickCapture: string;
    quickCaptureDescription: string;
    quickCaptureHint: string;
    quickCaptureSaved: string;
    quickCaptureDestination: string;
    searchPlaceholder: string;
    recentTitle: string;
    preview: string;
    edit: string;
    askTab: string;
    historyTab: string;
    infoTab: string;
    infoNoteId: string;
    infoPath: string;
    infoCreatedAt: string;
    infoUpdatedAt: string;
    infoContentHash: string;
    saveFromChat: string;
    saveLastReply: string;
    trashTitle: string;
    trashDescription: string;
    trashEmpty: string;
    restoreDeleted: string;
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

  tokenUsage: {
    title: string;
    input: string;
    output: string;
    total: string;
  };

  // Shortcuts
  shortcuts: {
    searchActions: string;
    noResults: string;
    actions: string;
    navigation: string;
    keyboardShortcuts: string;
    keyboardShortcutsDescription: string;
    openCommandPalette: string;
    toggleSidebar: string;
    openNotebook: string;
    openMemory: string;
    openProjects: string;
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
      agentIntegrations: string;
      mcpServers: string;
      skills: string;
      sandbox: string;
      notification: string;
      daemon: string;
      about: string;
    };
    agentIntegrations: {
      title: string;
      description: string;
      empty: string;
      knownAgents: {
        codex: string;
        claudeCode: string;
      };
      fields: {
        enabled: string;
        command: string;
        args: string;
        description: string;
        model: string;
        autoApprovePermissions: string;
        env: string;
      };
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
      clearAll: string;
      clearAllConfirmTitle: string;
      clearAllConfirmDescription: string;
      clearAllSuccess: string;
      factDeleteConfirmTitle: string;
      factDeleteConfirmDescription: string;
      factDeleteSuccess: string;
      noFacts: string;
      summaryReadOnly: string;
      memoryFullyEmpty: string;
      factPreviewLabel: string;
      searchPlaceholder: string;
      filterAll: string;
      filterFacts: string;
      filterSummaries: string;
      noMatches: string;
      surfaces: {
        provider: {
          title: string;
          description: string;
          modeSummary: string;
          activeModeLabel: string;
        };
        console: {
          title: string;
          description: string;
        };
      };
      storage: {
        title: string;
        description: string;
        modeLabel: string;
        fileMode: string;
        customMode: string;
        customClassLabel: string;
        customClassPlaceholder: string;
      };
      recall: {
        title: string;
        description: string;
        placeholder: string;
        searchButton: string;
        idle: string;
        empty: string;
        loadFailed: string;
        structuredTitle: string;
        structuredEmpty: string;
        historyTitle: string;
        historyEmpty: string;
        overviewTitle: string;
        overviewDescription: string;
        threadLabel: string;
        agentLabel: string;
      };
      openviking: {
        title: string;
        description: string;
        previewTitle: string;
        reindexButton: string;
        reindexingButton: string;
        reindexResult: string;
        searchPlaceholder: string;
        searchButton: string;
        idle: string;
        empty: string;
        loadFailed: string;
        headingLabel: string;
        rangeLabel: string;
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
      loadConfigFailed: string;
      createFailed: string;
      addProvider: string;
      providerListTitle: string;
      providerListDescription: string;
      emptyProvidersTitle: string;
      emptyProvidersDescription: string;
      categories: {
        domestic: string;
        aggregator: string;
        global: string;
        local: string;
      };
      marketplaceTitle: string;
      marketplaceDescription: string;
      emptyMarketplaceTitle: string;
      emptyMarketplaceDescription: string;
      addProviderCta: string;
      alreadyAdded: string;
      globalNoticeLabel: string;
      providerDetail: {
        backToMarketplace: string;
        providerSummary: string;
        credentialsTitle: string;
        credentialsDescription: string;
        modelsTitle: string;
        modelsDescription: string;
        emptyModelsTitle: string;
        emptyModelsDescription: string;
        customCreateTitle: string;
        customCreateDescription: string;
        customCreateAction: string;
      };
      statusLabels: {
        untested: string;
        success: string;
        failed: string;
      };
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
        events: string;
        workflow: string;
        templates: string;
        governance: string;
        platform: string;
        eventCenter: string;
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
        nextRun: string;
        notRecordedYet: string;
      };
      forms: {
        reminderTitle: string;
        reminderDescription: string;
        taskTitle: string;
        taskDescription: string;
        eventTitle: string;
        eventDescription: string;
        creatorTitle: string;
        creatorDescription: string;
        creatorKindLabel: string;
        creatorKinds: {
          reminder: string;
          task: string;
        };
        cadenceLabel: string;
        timeLabel: string;
        dateTimeLabel: string;
        dateTimePlaceholder: string;
        dateTimeHelper: string;
        dateTimeToday: string;
        dateTimeClear: string;
        dateTimeConfirm: string;
        previewLabel: string;
        previewDeliveryLabel: string;
        previewReminderHint: string;
        previewTaskHint: string;
        previewReminderAdvancedHint: string;
        previewDeliveryModes: {
          local: string;
          thread: string;
          channel: string;
          multi: string;
        };
        eventTypeLabel: string;
        eventActionLabel: string;
        eventPromptLabel: string;
        eventPromptPlaceholder: string;
        taskPromptLabel: string;
        taskPromptPlaceholder: string;
        intervalLabel: string;
        weekdayLabel: string;
        weekdayOptions: string[];
        customScheduleLabel: string;
        customSchedulePlaceholder: string;
        cadenceOptions: {
          once: string;
          daily: string;
          weekdays: string;
          weekly: string;
          interval: string;
          custom: string;
        };
        eventOptions: {
          agentRunCompleted: string;
          agentRunFailed: string;
          clarificationRequested: string;
          permissionRequested: string;
          automationRunFailed: string;
          threadFinished: string;
          threadFailed: string;
        };
        eventActionOptions: {
          notify: string;
          playSound: string;
          notebookWrite: string;
          agentPrompt: string;
        };
        createReminder: string;
        createTask: string;
        createEvent: string;
        advancedOptions: string;
      };
      sections: {
        remindersTitle: string;
        remindersDescription: string;
        tasksTitle: string;
        tasksDescription: string;
        eventsTitle: string;
        eventsDescription: string;
        historyTitle: string;
        historyDescription: string;
        emptyReminders: string;
        emptyTasks: string;
        emptyEvents: string;
        emptyHistory: string;
        scheduleLabel: string;
        nextRunLabel: string;
        lastResultLabel: string;
        actionLabel: string;
        summaryLabel: string;
        viewDetails: string;
        notScheduled: string;
        noSummary: string;
        startedLabel: string;
        finishedLabel: string;
        jobLabel: string;
        runningLabel: string;
        historyFilters: {
          all: string;
          failed: string;
          succeeded: string;
        };
        dailyPrefix: string;
        weekdaysPrefix: string;
        weeklyPrefix: string;
        oncePrefix: string;
        eventPrefix: string;
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

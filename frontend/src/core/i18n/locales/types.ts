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
      knowledge: string;
      capabilities: string;
    };
    sections: {
      appearance: string;
      memory: string;
      tools: string;
      skills: string;
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
    tools: {
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

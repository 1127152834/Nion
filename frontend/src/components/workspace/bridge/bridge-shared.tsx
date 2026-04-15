"use client";

import {
  CheckCircle2Icon,
  FolderOpenIcon,
  Gamepad2Icon,
  LoaderCircleIcon,
  MessageCircleMoreIcon,
  MessageSquareIcon,
  QrCodeIcon,
  SendIcon,
  TriangleAlertIcon,
  Trash2Icon,
  PlusIcon,
  WifiIcon,
} from "lucide-react";
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  createBridgeClient,
  getBridgeClient,
  type BridgeStatus,
} from "@/core/bridge/client";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

type TranslationVars = Record<string, string | number>;

const zhCN = {
  "common.loading": "加载中...",
  "common.save": "保存",
  "common.cancel": "取消",
  "common.delete": "删除",

  "bridge.title": "统一远程入口",
  "bridge.description": "把所有已连接渠道作为同一台 guardian-mode 电脑的统一远程入口来管理",
  "bridge.summaryTitle": "所有渠道都通往同一个执行面",
  "bridge.summaryDescription":
    "无论从 Telegram、飞书、Discord、QQ 还是微信进入，最终连接的都是同一台电脑、同一组任务执行上下文，以及同一个确认队列。",
  "bridge.summarySameComputer": "同一台电脑",
  "bridge.summarySameTasks": "同一组任务",
  "bridge.summarySameQueue": "同一个确认队列",
  "bridge.overviewTitle": "Bridge 概览",
  "bridge.overviewRuntimeStatus": "运行状态",
  "bridge.overviewActiveBindings": "活跃绑定",
  "bridge.overviewOpenIncidents": "待处理事件",
  "bridge.overviewEnabledPlatforms": "已启用渠道",
  "bridge.overviewUnavailable": "不可用",
  "bridge.overviewRunning": "运行中",
  "bridge.overviewStopped": "已停止",
  "bridge.overviewPendingRiskHint": "待处理风险提示",
  "bridge.overviewHintUnavailable": "桌面端 Bridge 尚未返回运行信息，当前概览风险状态未知。",
  "bridge.overviewHintIncidents": "当前存在待处理 Bridge 事件，进入具体渠道前应先关注这些风险。",
  "bridge.overviewHintAutoStartStopped": "已开启自动启动，但 Bridge 当前未运行，启动后可能需要进一步检查。",
  "bridge.overviewHintNoPlatforms": "当前没有启用任何渠道，这个远程入口仍不可达。",
  "bridge.overviewHintReady": "按当前运行概览看，没有待处理的 Bridge 风险提示。",
  "bridge.desktopOnly": "Bridge 仅在桌面应用中可用。",
  "bridge.activeHint": "桥接已激活。外部渠道可以向 Claude 发送任务。",
  "bridge.status": "桥接状态",
  "bridge.statusConnected": "已连接",
  "bridge.statusDisconnected": "未连接",
  "bridge.activeBindings": "{count} 个活跃绑定",
  "bridge.noBindings": "无活跃绑定",
  "bridge.channels": "渠道",
  "bridge.channelsDesc": "启用或禁用各消息渠道",
  "bridge.telegramChannel": "Telegram",
  "bridge.telegramChannelDesc": "通过 Telegram Bot 接收和回复消息",
  "bridge.feishuChannel": "飞书",
  "bridge.feishuChannelDesc": "通过飞书机器人接收和回复消息",
  "bridge.discordChannel": "Discord",
  "bridge.discordChannelDesc": "通过 Discord Bot 接收和回复消息",
  "bridge.qqChannel": "QQ",
  "bridge.qqChannelDesc": "通过 QQ 机器人接收和回复私聊消息",
  "bridge.weixinChannel": "微信",
  "bridge.weixinChannelDesc": "通过微信收发消息（扫码登录）",
  "bridge.defaults": "默认设置",
  "bridge.defaultsDesc": "桥接发起会话的默认设置",
  "bridge.defaultWorkDir": "工作目录",
  "bridge.defaultWorkDirHint": "桥接会话的默认项目文件夹",
  "bridge.defaultModel": "模型",
  "bridge.defaultModelHint": "桥接会话的默认模型",
  "bridge.browse": "浏览",
  "bridge.start": "启动桥接",
  "bridge.stop": "停止桥接",
  "bridge.starting": "启动中...",
  "bridge.stopping": "停止中...",
  "bridge.autoStart": "自动启动桥接",
  "bridge.autoStartDesc": "应用启动时自动启动桥接",
  "bridge.adapterRunning": "运行中",
  "bridge.adapterStopped": "已停止",
  "bridge.adapterLastMessage": "最近消息",
  "bridge.adapterLastError": "最近错误",
  "bridge.adapters": "适配器状态",
  "bridge.adaptersDesc": "各渠道适配器的实时状态",
  "bridge.telegramSettings": "Telegram 设置",
  "bridge.feishuSettings": "飞书设置",
  "bridge.discordSettings": "Discord 设置",
  "bridge.qqSettings": "QQ 设置",
  "bridge.weixinSettings": "微信设置",
  "bridge.allowedUsers": "允许的用户",
  "bridge.allowedUsersDesc": "允许使用桥接的 Telegram 用户 ID，逗号分隔",
  "bridge.allowedUsersHint": "留空则仅允许上方配置的 Chat ID",
  "bridge.errorNotEnabled": "桥接未启用，请先打开桥接开关。",
  "bridge.errorNoChannels": "没有启用任何渠道，请至少启用一个渠道（Telegram、飞书、Discord、QQ 或微信）。",
  "bridge.errorNoAdapters": "没有适配器成功启动，请检查渠道配置。",
  "bridge.errorAdapterConfig": "渠道配置无效，请检查已启用渠道的设置。",
  "bridge.errorNetwork": "启动桥接时网络错误。",
  "bridge.errorChannelNotEnabled": "当前渠道不可用。",
  "bridge.errorChannelNotVerified": "请先完成当前渠道的连接验证，再启用或启动桥接。",
  "bridge.channelStatusDesc": "当前渠道桥接运行状态",
  "bridge.bridgeChatBadge": "桥接",
  "bridge.enableRequiresVerification": "连接验证通过后才能启动桥接。",
  "bridge.enableChannelFirst": "先启用当前渠道，再尝试启动桥接。",

  "telegram.credentials": "Bot 凭据",
  "telegram.credentialsDesc": "输入您的 Telegram Bot Token 和 Chat ID",
  "telegram.botToken": "Bot Token",
  "telegram.chatId": "Chat ID",
  "telegram.chatIdHint": "先向您的 Bot 发送 /start，然后点击「自动检测」填入 Chat ID",
  "telegram.detectChatId": "自动检测",
  "telegram.chatIdDetected": "检测到 Chat ID：{id}（{name}）",
  "telegram.chatIdDetectFailed": "无法检测 Chat ID。请先向 Bot 发送 /start，然后重试。",
  "telegram.verify": "测试连接",
  "telegram.verified": "连接验证成功",
  "telegram.verifiedAs": "已连接为 @{name}",
  "telegram.verifyFailed": "连接失败",
  "telegram.enterTokenFirst": "请先输入 Bot Token",
  "telegram.setupGuide": "设置指南",
  "telegram.step1": "打开 Telegram 搜索 @BotFather",
  "telegram.step2": "发送 /newbot 并按提示创建 Bot",
  "telegram.step3": "复制 Bot Token 并粘贴到上方",
  "telegram.step4": "点击「测试连接」验证 Token 是否有效",
  "telegram.step5": "向您的 Bot 发送 /start，然后点击 Chat ID 旁的「自动检测」按钮",
  "telegram.step6": "点击「保存」存储凭据",

  "feishu.credentials": "应用凭据",
  "feishu.credentialsDesc": "输入您的飞书 App ID 和 App Secret",
  "feishu.appId": "App ID",
  "feishu.appSecret": "App Secret",
  "feishu.domain": "平台",
  "feishu.domainFeishu": "飞书 (feishu.cn)",
  "feishu.domainLark": "Lark (larksuite.com)",
  "feishu.domainHint": "中国大陆选择飞书，海外选择 Lark",
  "feishu.verify": "测试连接",
  "feishu.verified": "连接验证成功",
  "feishu.verifiedAs": "已连接为 {name}",
  "feishu.verifyFailed": "连接失败",
  "feishu.enterCredentialsFirst": "请先输入 App ID 和 App Secret",
  "feishu.allowFrom": "允许来源",
  "feishu.allowFromDesc": "控制哪些用户可以向机器人发送私信",
  "feishu.allowFromHint": "逗号分隔的 open_id。使用 * 允许所有用户。",
  "feishu.dmPolicy": "私信策略",
  "feishu.dmPolicyOpen": "开放 — 接受所有用户私信",
  "feishu.dmPolicyPairing": "配对 — 需要配对握手",
  "feishu.dmPolicyAllowlist": "白名单 — 仅允许列表中的用户",
  "feishu.dmPolicyDisabled": "禁用 — 忽略所有私信",
  "feishu.accessBehavior": "访问与行为",
  "feishu.accessBehaviorDesc": "配置谁可以使用机器人及其行为方式",
  "feishu.saved": "已保存",
  "feishu.groupSettings": "群聊设置",
  "feishu.groupSettingsDesc": "控制机器人在群聊中的响应方式",
  "feishu.groupPolicy": "群聊策略",
  "feishu.groupPolicyOpen": "开放 — 响应所有群消息",
  "feishu.groupPolicyAllowlist": "白名单 — 仅指定群组",
  "feishu.groupPolicyDisabled": "禁用 — 忽略所有群消息",
  "feishu.groupAllowFrom": "允许的群组",
  "feishu.groupAllowFromHint": "允许的群组 chat_id，逗号分隔",
  "feishu.requireMention": "需要 @提及",
  "feishu.requireMentionDesc": "群聊中仅在 @机器人时响应",
  "feishu.setupGuide": "设置指南",
  "feishu.step1": "前往飞书开放平台 (open.feishu.cn) 创建自建应用",
  "feishu.step2": "在应用功能中启用「机器人」能力",
  "feishu.step3": "在凭证页面复制 App ID 和 App Secret",
  "feishu.step4": "添加事件订阅：im.message.receive_v1",
  "feishu.step5": "发布应用版本并在管理后台审批通过",
  "feishu.step6": "将凭据粘贴到上方，点击「测试连接」验证",
  "feishu.threadSession": "话题会话",
  "feishu.threadSessionDesc": "启用每话题独立上下文（不同话题中的并行对话）",

  "discord.credentials": "Bot 凭据",
  "discord.credentialsDesc": "输入您的 Discord Bot Token",
  "discord.botToken": "Bot Token",
  "discord.verify": "测试连接",
  "discord.verified": "连接验证成功",
  "discord.verifiedAs": "已连接为 {name}",
  "discord.verifyFailed": "连接失败",
  "discord.enterTokenFirst": "请先输入 Bot Token",
  "discord.allowedUsers": "授权设置",
  "discord.allowedUsersDesc": "控制哪些用户和频道可以与 Bot 交互",
  "discord.allowedUserIds": "允许的用户 ID",
  "discord.allowedUsersHint": "Discord 用户 ID，多个用逗号分隔。用户和频道均为空时拒绝所有请求。",
  "discord.allowedChannelIds": "允许的频道 ID",
  "discord.allowedChannelsHint": "允许的 Discord 频道 ID，多个用逗号分隔。",
  "discord.guildSettings": "服务器和群组设置",
  "discord.guildSettingsDesc": "控制 Bot 在 Discord 服务器中的响应方式",
  "discord.allowedGuilds": "允许的服务器 (Guild) ID",
  "discord.allowedGuildsHint": "服务器 ID，多个用逗号分隔。留空则允许所有服务器。",
  "discord.groupPolicy": "服务器消息策略",
  "discord.groupPolicyOpen": "开放 — 响应所有服务器频道消息",
  "discord.groupPolicyDisabled": "禁用 — 忽略所有服务器消息（仅私信）",
  "discord.requireMention": "需要 @提及",
  "discord.requireMentionDesc": "服务器中仅在 @机器人时响应",
  "discord.streamPreview": "流式预览",
  "discord.streamPreviewDesc": "通过编辑消息实时显示响应预览",
  "discord.imageSettings": "附件与图片",
  "discord.imageSettingsDesc": "控制附件大小与图片处理",
  "discord.maxAttachmentSize": "最大附件大小 (MB)",
  "discord.maxAttachmentSizeHint": "支持下载和处理的最大附件大小",
  "discord.imageEnabled": "启用图片输入",
  "discord.imageEnabledDesc": "允许下载和处理 Discord 中的图片附件",
  "discord.setupGuide": "配置指南",
  "discord.setupBotTitle": "创建 Discord Bot",
  "discord.step1": "前往 Discord 开发者门户 (https://discord.com/developers/applications)，点击「New Application」创建应用",
  "discord.step2": "进入左侧「Bot」页面，点击「Add Bot」创建机器人",
  "discord.step3": "向下滚动到「Privileged Gateway Intents」，开启「MESSAGE CONTENT INTENT」开关",
  "discord.step4": "点击「Reset Token」复制 Bot Token，粘贴到上方「Bot 凭据」中保存",
  "discord.step5": "前往「OAuth2 → URL Generator」，Scopes 勾选「bot」，Bot Permissions 勾选「Send Messages」和「Read Message History」",
  "discord.step6": "复制生成的邀请链接，在浏览器中打开，将 Bot 邀请到你的服务器",
  "discord.step7": "回到上方点击「测试连接」，确认显示 Bot 名称即配置成功",
  "discord.setupIdTitle": "获取 ID（需开启开发者模式）",
  "discord.stepDevMode": "打开 Discord 客户端 →「用户设置」→「高级」→ 开启「开发者模式」",
  "discord.stepUserId": "获取用户 ID：右键点击自己的头像或用户名 →「复制用户 ID」",
  "discord.stepChannelId": "获取频道 ID：右键点击左侧频道名称 →「复制频道 ID」",
  "discord.stepGuildId": "获取服务器 ID：右键点击左上角服务器名称 →「复制服务器 ID」",

  "qq.credentials": "机器人凭据",
  "qq.credentialsDesc": "输入您的 QQ 机器人 App ID 和 App Secret",
  "qq.appId": "App ID",
  "qq.appSecret": "App Secret",
  "qq.verify": "测试连接",
  "qq.verified": "连接验证成功",
  "qq.verifyFailed": "连接失败",
  "qq.enterCredentialsFirst": "请先输入 App ID 和 App Secret",
  "qq.allowedUsers": "允许的用户",
  "qq.allowedUsersDesc": "允许使用桥接的 user_openid，逗号分隔",
  "qq.allowedUsersHint": "留空则允许所有用户",
  "qq.imageSettings": "图片设置",
  "qq.imageSettingsDesc": "控制机器人如何处理 QQ 中的图片",
  "qq.imageEnabled": "启用图片输入",
  "qq.imageEnabledDesc": "允许接收和处理来自 QQ 的图片",
  "qq.maxImageSize": "最大图片大小 (MB)",
  "qq.maxImageSizeHint": "图片文件最大大小，单位 MB（默认：20）",
  "qq.setupGuide": "设置指南",
  "qq.step1": "前往 QQ 机器人快速创建页面 (q.qq.com/qqbot/openclaw) 创建机器人并生成 App ID 和 App Secret",
  "qq.step2": "将 App ID 和 App Secret 粘贴到上方，点击「保存」",
  "qq.step3": "点击「测试连接」验证凭据是否有效",
  "qq.step4": "回到桥接主页，打开 QQ 渠道开关，启动桥接",
  "qq.step5": "添加 QQ 机器人为好友并发送消息开始聊天",

  "weixin.accounts": "账号管理",
  "weixin.accountsDesc": "管理已关联的微信账号",
  "weixin.addAccount": "添加账号",
  "weixin.noAccounts": "暂未关联任何微信账号",
  "weixin.accountActive": "活跃",
  "weixin.accountPaused": "已暂停",
  "weixin.accountExpired": "会话过期",
  "weixin.accountUpdateFailed": "更新微信账号失败",
  "weixin.accountUpdateSavedRestartFailed": "账号已更新，但 Bridge 重启失败",
  "weixin.accountDeleteFailed": "移除微信账号失败",
  "weixin.accountDeleteSavedRestartFailed": "账号已移除，但 Bridge 重启失败",
  "weixin.qrLogin": "扫码登录",
  "weixin.qrLoginDesc": "使用微信扫描二维码以关联账号",
  "weixin.qrWaiting": "等待扫码...",
  "weixin.qrScanned": "已扫码！请在手机上确认...",
  "weixin.qrConfirmed": "登录成功！",
  "weixin.qrConfirmedRestartFailed": "账号已关联，但 Bridge 重启失败",
  "weixin.qrExpired": "二维码已过期，正在刷新...",
  "weixin.qrFailed": "登录失败",
  "weixin.riskWarning": "本功能通过微信 OpenClaw 插件协议连接非 OpenClaw 产品，严格来看可能违反微信使用协议，存在账号风险，请谨慎使用。",
  "weixin.setupGuide": "设置指南",
  "weixin.step1": "点击\"添加账号\"生成二维码",
  "weixin.step2": "打开手机微信扫描二维码",
  "weixin.step3": "在手机上确认登录",
  "weixin.step4": "返回 Bridge 页面，开启微信通道开关并启动 Bridge",
  "weixin.step5": "向已关联的微信账号发送消息即可开始聊天",
} as const;

const enUS: Record<keyof typeof zhCN, string> = {
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",

  "bridge.title": "Unified Remote Entry",
  "bridge.description":
    "Manage every connected channel as one remote entry surface into the same guardian-mode computer",
  "bridge.summaryTitle": "One remote entry surface",
  "bridge.summaryDescription":
    "Telegram, Feishu, Discord, QQ, and WeChat all connect into the same computer, the same task execution context, and the same confirmation queue.",
  "bridge.summarySameComputer": "Same computer",
  "bridge.summarySameTasks": "Same tasks",
  "bridge.summarySameQueue": "Same confirmation queue",
  "bridge.overviewTitle": "Bridge overview",
  "bridge.overviewRuntimeStatus": "Runtime status",
  "bridge.overviewActiveBindings": "Active bindings",
  "bridge.overviewOpenIncidents": "Open incidents",
  "bridge.overviewEnabledPlatforms": "Enabled platforms",
  "bridge.overviewUnavailable": "Unavailable",
  "bridge.overviewRunning": "Running",
  "bridge.overviewStopped": "Stopped",
  "bridge.overviewPendingRiskHint": "Pending risk hint",
  "bridge.overviewHintUnavailable": "Runtime status is unavailable until the desktop bridge responds.",
  "bridge.overviewHintIncidents": "Open bridge incidents need review before this entry surface is considered stable.",
  "bridge.overviewHintAutoStartStopped": "Auto-start is enabled, but the bridge is currently stopped and may need attention after launch.",
  "bridge.overviewHintNoPlatforms": "No platforms are enabled yet, so this remote entry surface is not reachable.",
  "bridge.overviewHintReady": "No pending bridge risk is visible from the current runtime overview.",
  "bridge.desktopOnly": "Bridge is only available in the desktop app.",
  "bridge.activeHint": "Bridge is active. External channels can send tasks to Claude.",
  "bridge.status": "Bridge Status",
  "bridge.statusConnected": "Connected",
  "bridge.statusDisconnected": "Disconnected",
  "bridge.activeBindings": "{count} active bindings",
  "bridge.noBindings": "No active bindings",
  "bridge.channels": "Channels",
  "bridge.channelsDesc": "Enable or disable each messaging channel",
  "bridge.telegramChannel": "Telegram",
  "bridge.telegramChannelDesc": "Receive and reply through a Telegram bot",
  "bridge.feishuChannel": "Feishu",
  "bridge.feishuChannelDesc": "Receive and reply through a Feishu bot",
  "bridge.discordChannel": "Discord",
  "bridge.discordChannelDesc": "Receive and reply through a Discord bot",
  "bridge.qqChannel": "QQ",
  "bridge.qqChannelDesc": "Receive and reply through a QQ bot",
  "bridge.weixinChannel": "WeChat",
  "bridge.weixinChannelDesc": "Send and receive through WeChat QR login",
  "bridge.defaults": "Default Settings",
  "bridge.defaultsDesc": "Default settings for bridge-created sessions",
  "bridge.defaultWorkDir": "Working Directory",
  "bridge.defaultWorkDirHint": "Default project folder for bridge sessions",
  "bridge.defaultModel": "Model",
  "bridge.defaultModelHint": "Default model for bridge sessions",
  "bridge.browse": "Browse",
  "bridge.start": "Start Bridge",
  "bridge.stop": "Stop Bridge",
  "bridge.starting": "Starting...",
  "bridge.stopping": "Stopping...",
  "bridge.autoStart": "Auto Start Bridge",
  "bridge.autoStartDesc": "Start the bridge automatically when the app launches",
  "bridge.adapterRunning": "Running",
  "bridge.adapterStopped": "Stopped",
  "bridge.adapterLastMessage": "Last message",
  "bridge.adapterLastError": "Last error",
  "bridge.adapters": "Adapter Status",
  "bridge.adaptersDesc": "Realtime state for each bridge adapter",
  "bridge.telegramSettings": "Telegram Settings",
  "bridge.feishuSettings": "Feishu Settings",
  "bridge.discordSettings": "Discord Settings",
  "bridge.qqSettings": "QQ Settings",
  "bridge.weixinSettings": "WeChat Settings",
  "bridge.allowedUsers": "Allowed Users",
  "bridge.allowedUsersDesc": "Telegram user IDs allowed to use the bridge, comma separated",
  "bridge.allowedUsersHint": "Leave blank to allow only the configured Chat ID",
  "bridge.errorNotEnabled": "Bridge is disabled. Turn it on first.",
  "bridge.errorNoChannels": "No channels are enabled. Enable at least one channel.",
  "bridge.errorNoAdapters": "No adapters started successfully. Check channel settings.",
  "bridge.errorAdapterConfig": "Invalid channel configuration. Check enabled channel settings.",
  "bridge.errorNetwork": "Network error while starting bridge.",
  "bridge.errorChannelNotEnabled": "This channel is unavailable.",
  "bridge.errorChannelNotVerified": "Verify this channel connection before enabling or starting it.",
  "bridge.channelStatusDesc": "Runtime status for this channel",
  "bridge.bridgeChatBadge": "Bridge",
  "bridge.enableRequiresVerification": "Bridge can only start after connection verification succeeds.",
  "bridge.enableChannelFirst": "Enable this channel first, then try starting Bridge.",

  "telegram.credentials": "Bot Credentials",
  "telegram.credentialsDesc": "Enter your Telegram Bot Token and Chat ID",
  "telegram.botToken": "Bot Token",
  "telegram.chatId": "Chat ID",
  "telegram.chatIdHint": "Send /start to your bot first, then click Detect to fill the Chat ID",
  "telegram.detectChatId": "Detect",
  "telegram.chatIdDetected": "Detected Chat ID: {id} ({name})",
  "telegram.chatIdDetectFailed": "Unable to detect Chat ID. Send /start to the bot and try again.",
  "telegram.verify": "Test Connection",
  "telegram.verified": "Connection verified",
  "telegram.verifiedAs": "Connected as @{name}",
  "telegram.verifyFailed": "Connection failed",
  "telegram.enterTokenFirst": "Enter Bot Token first",
  "telegram.setupGuide": "Setup Guide",
  "telegram.step1": "Open Telegram and search for @BotFather",
  "telegram.step2": "Send /newbot and follow the prompts",
  "telegram.step3": "Copy the Bot Token and paste it above",
  "telegram.step4": "Click Test Connection to validate the token",
  "telegram.step5": "Send /start to your bot, then click Detect beside Chat ID",
  "telegram.step6": "Click Save to store the credentials",

  "feishu.credentials": "App Credentials",
  "feishu.credentialsDesc": "Enter your Feishu App ID and App Secret",
  "feishu.appId": "App ID",
  "feishu.appSecret": "App Secret",
  "feishu.domain": "Platform",
  "feishu.domainFeishu": "Feishu (feishu.cn)",
  "feishu.domainLark": "Lark (larksuite.com)",
  "feishu.domainHint": "Choose Feishu in mainland China, Lark elsewhere",
  "feishu.verify": "Test Connection",
  "feishu.verified": "Connection verified",
  "feishu.verifiedAs": "Connected as {name}",
  "feishu.verifyFailed": "Connection failed",
  "feishu.enterCredentialsFirst": "Enter App ID and App Secret first",
  "feishu.allowFrom": "Allowed Senders",
  "feishu.allowFromDesc": "Control which users can send direct messages to the bot",
  "feishu.allowFromHint": "Comma separated open_id list. Use * to allow everyone.",
  "feishu.dmPolicy": "DM Policy",
  "feishu.dmPolicyOpen": "Open — accept all direct messages",
  "feishu.dmPolicyPairing": "Pairing — require pairing handshake",
  "feishu.dmPolicyAllowlist": "Allowlist — only listed users",
  "feishu.dmPolicyDisabled": "Disabled — ignore all direct messages",
  "feishu.accessBehavior": "Access and Behavior",
  "feishu.accessBehaviorDesc": "Configure who can use the bot and how it behaves",
  "feishu.saved": "Saved",
  "feishu.groupSettings": "Group Settings",
  "feishu.groupSettingsDesc": "Control how the bot responds in group chats",
  "feishu.groupPolicy": "Group Policy",
  "feishu.groupPolicyOpen": "Open — respond to all group messages",
  "feishu.groupPolicyAllowlist": "Allowlist — only selected groups",
  "feishu.groupPolicyDisabled": "Disabled — ignore all group messages",
  "feishu.groupAllowFrom": "Allowed Groups",
  "feishu.groupAllowFromHint": "Allowed group chat_id values, comma separated",
  "feishu.requireMention": "Require @mention",
  "feishu.requireMentionDesc": "Only respond in groups when the bot is @mentioned",
  "feishu.setupGuide": "Setup Guide",
  "feishu.step1": "Create a self-built app in the Feishu open platform",
  "feishu.step2": "Enable the Bot capability in app features",
  "feishu.step3": "Copy App ID and App Secret from the credentials page",
  "feishu.step4": "Add event subscription: im.message.receive_v1",
  "feishu.step5": "Publish the app version and complete approval",
  "feishu.step6": "Paste the credentials above and click Test Connection",
  "feishu.threadSession": "Thread Session",
  "feishu.threadSessionDesc": "Use separate context per thread for parallel conversations",

  "discord.credentials": "Bot Credentials",
  "discord.credentialsDesc": "Enter your Discord Bot Token",
  "discord.botToken": "Bot Token",
  "discord.verify": "Test Connection",
  "discord.verified": "Connection verified",
  "discord.verifiedAs": "Connected as {name}",
  "discord.verifyFailed": "Connection failed",
  "discord.enterTokenFirst": "Enter Bot Token first",
  "discord.allowedUsers": "Authorization Settings",
  "discord.allowedUsersDesc": "Control which users and channels can interact with the bot",
  "discord.allowedUserIds": "Allowed User IDs",
  "discord.allowedUsersHint": "Comma separated Discord user IDs. If both user and channel lists are empty, all requests are denied.",
  "discord.allowedChannelIds": "Allowed Channel IDs",
  "discord.allowedChannelsHint": "Comma separated Discord channel IDs.",
  "discord.guildSettings": "Guild and Group Settings",
  "discord.guildSettingsDesc": "Control how the bot responds in Discord guilds",
  "discord.allowedGuilds": "Allowed Guild IDs",
  "discord.allowedGuildsHint": "Comma separated guild IDs. Leave empty to allow all guilds.",
  "discord.groupPolicy": "Guild Message Policy",
  "discord.groupPolicyOpen": "Open — respond to all guild channel messages",
  "discord.groupPolicyDisabled": "Disabled — ignore all guild messages (DM only)",
  "discord.requireMention": "Require @mention",
  "discord.requireMentionDesc": "Only respond in guilds when the bot is @mentioned",
  "discord.streamPreview": "Streaming Preview",
  "discord.streamPreviewDesc": "Show live response preview by editing messages",
  "discord.imageSettings": "Attachments and Images",
  "discord.imageSettingsDesc": "Control attachment size and image handling",
  "discord.maxAttachmentSize": "Max Attachment Size (MB)",
  "discord.maxAttachmentSizeHint": "Largest attachment size that can be downloaded and processed",
  "discord.imageEnabled": "Enable image input",
  "discord.imageEnabledDesc": "Allow downloading and processing Discord image attachments",
  "discord.setupGuide": "Setup Guide",
  "discord.setupBotTitle": "Create a Discord Bot",
  "discord.step1": "Open the Discord developer portal and create a new application",
  "discord.step2": "Open the Bot page and click Add Bot",
  "discord.step3": "Enable MESSAGE CONTENT INTENT under Privileged Gateway Intents",
  "discord.step4": "Reset and copy the Bot Token, then paste it above",
  "discord.step5": "Generate an OAuth2 bot invite URL with Send Messages and Read Message History",
  "discord.step6": "Open the invite URL and add the bot to your server",
  "discord.step7": "Return here and click Test Connection to confirm setup",
  "discord.setupIdTitle": "Get IDs (Developer Mode required)",
  "discord.stepDevMode": "Enable Developer Mode in Discord settings",
  "discord.stepUserId": "Right click your avatar or username and copy the user ID",
  "discord.stepChannelId": "Right click a channel and copy the channel ID",
  "discord.stepGuildId": "Right click a server and copy the guild ID",

  "qq.credentials": "Bot Credentials",
  "qq.credentialsDesc": "Enter your QQ bot App ID and App Secret",
  "qq.appId": "App ID",
  "qq.appSecret": "App Secret",
  "qq.verify": "Test Connection",
  "qq.verified": "Connection verified",
  "qq.verifyFailed": "Connection failed",
  "qq.enterCredentialsFirst": "Enter App ID and App Secret first",
  "qq.allowedUsers": "Allowed Users",
  "qq.allowedUsersDesc": "Allowed user_openid values, comma separated",
  "qq.allowedUsersHint": "Leave blank to allow every user",
  "qq.imageSettings": "Image Settings",
  "qq.imageSettingsDesc": "Control how the bot handles QQ images",
  "qq.imageEnabled": "Enable image input",
  "qq.imageEnabledDesc": "Allow receiving and processing images from QQ",
  "qq.maxImageSize": "Max Image Size (MB)",
  "qq.maxImageSizeHint": "Maximum image file size in MB (default: 20)",
  "qq.setupGuide": "Setup Guide",
  "qq.step1": "Create a QQ bot and generate App ID/App Secret",
  "qq.step2": "Paste the credentials above and click Save",
  "qq.step3": "Click Test Connection to validate the credentials",
  "qq.step4": "Return to the bridge home page, enable QQ, and start bridge",
  "qq.step5": "Add the QQ bot as a friend and send a message to begin",

  "weixin.accounts": "Account Management",
  "weixin.accountsDesc": "Manage linked WeChat accounts",
  "weixin.addAccount": "Add Account",
  "weixin.noAccounts": "No WeChat accounts linked yet",
  "weixin.accountActive": "Active",
  "weixin.accountPaused": "Paused",
  "weixin.accountExpired": "Session expired",
  "weixin.accountUpdateFailed": "Failed to update WeChat account",
  "weixin.accountUpdateSavedRestartFailed": "Account updated, but bridge restart failed",
  "weixin.accountDeleteFailed": "Failed to remove WeChat account",
  "weixin.accountDeleteSavedRestartFailed": "Account removed, but bridge restart failed",
  "weixin.qrLogin": "QR Login",
  "weixin.qrLoginDesc": "Scan the QR code with WeChat to link an account",
  "weixin.qrWaiting": "Waiting for scan...",
  "weixin.qrScanned": "QR scanned. Confirm on your phone...",
  "weixin.qrConfirmed": "Login successful!",
  "weixin.qrConfirmedRestartFailed": "Account linked, but bridge restart failed",
  "weixin.qrExpired": "QR code expired, refreshing...",
  "weixin.qrFailed": "Login failed",
  "weixin.riskWarning": "This feature uses the WeChat OpenClaw plugin protocol with a non-OpenClaw product and may violate WeChat terms of service. Use it cautiously.",
  "weixin.setupGuide": "Setup Guide",
  "weixin.step1": "Click Add Account to generate a QR code",
  "weixin.step2": "Open WeChat on your phone and scan the QR code",
  "weixin.step3": "Confirm the login on your phone",
  "weixin.step4": "Return to Bridge, enable the WeChat channel, and start bridge",
  "weixin.step5": "Send a message to the linked WeChat account to begin chatting",
};

function interpolate(template: string, vars?: TranslationVars) {
  if (!vars) {
    return template;
  }
  return template.replaceAll(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function useBridgeTranslation() {
  const { locale } = useI18n();
  const dictionary = locale === "zh-CN" ? zhCN : enUS;

  return {
    locale,
    t: (key: keyof typeof zhCN, vars?: TranslationVars) =>
      interpolate(dictionary[key] ?? key, vars),
  };
}

export function settingToBool(value: string | undefined) {
  return value === "true";
}

export function boolToSetting(value: boolean) {
  return value ? "true" : "false";
}

export function normalizeQrImageSrc(value: string) {
  if (value.startsWith("data:") || value.startsWith("http")) {
    return value;
  }
  return `data:image/png;base64,${value}`;
}

export function bridgePlatformLabel(
  platform: string,
  t: (key: keyof typeof zhCN, vars?: TranslationVars) => string,
) {
  switch (platform) {
    case "telegram":
      return t("bridge.telegramChannel");
    case "feishu":
      return t("bridge.feishuChannel");
    case "discord":
      return t("bridge.discordChannel");
    case "qq":
      return t("bridge.qqChannel");
    case "weixin":
      return t("bridge.weixinChannel");
    default:
      return platform;
  }
}

export function isBridgePlatformVerified(
  settings: Record<string, string> | null | undefined,
  platform: string,
) {
  if (settings?.[`bridge_${platform}_verified`] !== "true") {
    return false;
  }

  switch (platform) {
    case "telegram":
      return Boolean(settings.bridge_telegram_bot_token ?? settings.telegram_bot_token);
    case "feishu":
      return Boolean(settings.bridge_feishu_app_id && settings.bridge_feishu_app_secret);
    case "discord":
      return Boolean(settings.bridge_discord_bot_token);
    case "qq":
      return Boolean(settings.bridge_qq_app_id && settings.bridge_qq_app_secret);
    case "weixin":
      return true;
    default:
      return false;
  }
}

function useBridgePlatformStatus(platform: string) {
  const client = getBridgeClient();
  const [status, setStatus] = useState<BridgeStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!client) {
      return;
    }
    setStatus(await client.getStatus());
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const adapter = useMemo(
    () =>
      status?.adapters.find(
        (item) => item.platform === platform || item.channelType === platform,
      ) ?? null,
    [platform, status],
  );

  return {
    client,
    adapter,
    refresh,
  };
}

export function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-border/50 p-4 transition-shadow hover:shadow-sm",
        className,
      )}
    >
      {(Boolean(title) || Boolean(description)) && (
        <div className="space-y-1">
          {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}

export function FieldRow({
  label,
  description,
  children,
  separator,
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  separator?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        separator && "border-t border-border/30 pt-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const variantStyles = {
  success:
    "border-emerald-300/70 bg-linear-to-r from-emerald-50 via-emerald-50 to-white text-emerald-900 shadow-[0_12px_32px_-24px_rgba(5,150,105,0.6)] dark:border-emerald-400/30 dark:from-emerald-500/14 dark:via-emerald-500/10 dark:to-transparent dark:text-emerald-100",
  warning:
    "border-amber-300/70 bg-linear-to-r from-amber-50 via-amber-50 to-orange-50/70 text-amber-950 shadow-[0_16px_36px_-26px_rgba(217,119,6,0.65)] dark:border-amber-400/30 dark:from-amber-500/14 dark:via-amber-500/10 dark:to-transparent dark:text-amber-100",
  error:
    "border-red-300/70 bg-linear-to-r from-red-50 via-red-50 to-white text-red-900 shadow-[0_12px_32px_-24px_rgba(220,38,38,0.6)] dark:border-red-400/30 dark:from-red-500/14 dark:via-red-500/10 dark:to-transparent dark:text-red-100",
  info: "border-primary/20 bg-primary/10 text-primary shadow-[0_12px_30px_-24px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
} as const;

export function StatusBanner({
  variant,
  icon,
  description,
  children,
  className,
}: {
  variant: "success" | "warning" | "error" | "info";
  icon?: ReactElement;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-3.5 py-3 text-sm",
        variantStyles[variant],
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-white/65 via-white/15 to-transparent dark:from-white/6 dark:via-transparent dark:to-transparent" />
      <div className="relative flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-current shadow-sm ring-1 ring-current/10 dark:bg-white/10">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="min-w-0 text-[13px] leading-5 font-semibold text-current">{children}</div>
          {description ? (
            <div className="mt-1 text-xs leading-5 text-current/72">{description}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BridgePlatformRuntimeCard({
  platform,
  bridgeEnabled,
  connectionVerified,
}: {
  platform: string;
  bridgeEnabled: boolean;
  connectionVerified: boolean;
}) {
  const { t } = useBridgeTranslation();
  const { client, adapter, refresh } = useBridgePlatformStatus(platform);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  if (!client) {
    return null;
  }

  const running = Boolean(adapter?.running);

  const handleStart = async () => {
    setStarting(true);
    try {
      const reason = await createBridgeClient().startPlatform(platform);
      if (reason) {
        const reasonMessages: Record<string, string> = {
          bridge_not_enabled: t("bridge.errorNotEnabled"),
          channel_not_verified: t("bridge.errorChannelNotVerified"),
          no_adapters_started: t("bridge.errorNoAdapters"),
          adapter_unavailable: t("bridge.errorNetwork"),
          network_error: t("bridge.errorNetwork"),
        };
        const message = reason.startsWith("adapter_config_invalid")
          ? t("bridge.errorAdapterConfig")
          : reasonMessages[reason] ?? reason;
        toast.error(message);
      }
      await refresh();
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await createBridgeClient().stopPlatform(platform);
      await refresh();
    } finally {
      setStopping(false);
    }
  };

  return (
    <SettingsCard title={t("bridge.status")} description={t("bridge.channelStatusDesc")}>
      {!bridgeEnabled ? (
        <StatusBanner
          variant="warning"
          icon={<Warning className="size-4" />}
          description={t("bridge.enableChannelFirst")}
        >
          {t("bridge.errorNotEnabled")}
        </StatusBanner>
      ) : null}
      {bridgeEnabled && !connectionVerified ? (
        <StatusBanner
          variant="warning"
          icon={<Warning className="size-4" />}
          description={t("bridge.enableRequiresVerification")}
        >
          {t("bridge.errorChannelNotVerified")}
        </StatusBanner>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{bridgePlatformLabel(platform, t)}</div>
          <div className="text-xs text-muted-foreground">
            {running ? t("bridge.statusConnected") : t("bridge.statusDisconnected")}
          </div>
          {adapter?.lastMessageAt ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {t("bridge.adapterLastMessage")}:{" "}
              {new Date(adapter.lastMessageAt).toLocaleString()}
            </div>
          ) : null}
          {adapter?.error ? (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {t("bridge.adapterLastError")}: {adapter.error}
            </div>
          ) : null}
        </div>

        {running ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleStop()}
            disabled={stopping}
          >
            {stopping ? <SpinnerGap className="mr-1.5 size-3.5 animate-spin" /> : null}
            {stopping ? t("bridge.stopping") : t("bridge.stop")}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => void handleStart()}
            disabled={starting || !bridgeEnabled || !connectionVerified}
          >
            {starting ? <SpinnerGap className="mr-1.5 size-3.5 animate-spin" /> : null}
            {starting ? t("bridge.starting") : t("bridge.start")}
          </Button>
        )}
      </div>
    </SettingsCard>
  );
}

export const WifiHigh = WifiIcon;
export const TelegramLogo = SendIcon;
export const ChatTeardrop = MessageSquareIcon;
export const GameController = Gamepad2Icon;
export const ChatsCircle = MessageCircleMoreIcon;
export const SpinnerGap = LoaderCircleIcon;
export const CheckCircle = CheckCircle2Icon;
export const Warning = TriangleAlertIcon;
export const Trash = Trash2Icon;
export const Plus = PlusIcon;
export const Code = QrCodeIcon;
export const Folder = FolderOpenIcon;

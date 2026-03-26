export const WEIXIN_MESSAGE_TYPE = {
  NONE: 0,
  USER: 1,
  BOT: 2,
} as const;

export const WEIXIN_MESSAGE_ITEM_TYPE = {
  TEXT: 1,
} as const;

export const WEIXIN_MESSAGE_STATE = {
  NEW: 0,
  GENERATING: 1,
  FINISH: 2,
} as const;

export const WEIXIN_TYPING_STATUS = {
  TYPING: 1,
  CANCEL: 2,
} as const;

export const WEIXIN_SESSION_EXPIRED_ERRCODE = -14;
export const WEIXIN_DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
export const WEIXIN_DEFAULT_CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";

export type WeixinCredentials = {
  botToken: string;
  ilinkBotId: string;
  baseUrl: string;
  cdnBaseUrl: string;
};

export type WeixinMessageItem = {
  type: number;
  text_item?: {
    text: string;
  };
};

export type WeixinMessage = {
  seq?: number;
  message_id?: string;
  from_user_id: string;
  item_list?: WeixinMessageItem[];
  context_token?: string;
  create_time?: number;
  ref_message?: {
    title?: string;
    content?: string;
  };
};

export type WeixinGetUpdatesResponse = {
  errcode?: number;
  errmsg?: string;
  msgs?: WeixinMessage[];
  get_updates_buf?: string;
};

export type WeixinQrCodeStartResponse = {
  errcode?: number;
  errmsg?: string;
  qrcode?: string;
  qrcode_img_content?: string;
};

export type WeixinQrCodeStatusResponse = {
  errcode?: number;
  errmsg?: string;
  status?: "wait" | "scaned" | "confirmed" | "expired";
  bot_token?: string;
  ilink_bot_id?: string;
  baseurl?: string;
  ilink_user_id?: string;
};

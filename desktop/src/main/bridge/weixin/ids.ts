const WEIXIN_PREFIX = "weixin::";
const WEIXIN_SEPARATOR = "::";

export function encodeWeixinChatId(accountId: string, peerUserId: string) {
  return `${WEIXIN_PREFIX}${accountId}${WEIXIN_SEPARATOR}${peerUserId}`;
}

export function decodeWeixinChatId(chatId: string) {
  if (!chatId.startsWith(WEIXIN_PREFIX)) {
    return null;
  }
  const rest = chatId.slice(WEIXIN_PREFIX.length);
  const separatorIndex = rest.indexOf(WEIXIN_SEPARATOR);
  if (separatorIndex < 0) {
    return null;
  }
  const accountId = rest.slice(0, separatorIndex);
  const peerUserId = rest.slice(separatorIndex + WEIXIN_SEPARATOR.length);
  if (!accountId || !peerUserId) {
    return null;
  }
  return { accountId, peerUserId };
}

/**
 * Ngữ cảnh dự án cho chatbox AI (mục III.3a) — cross-cutting như `shared/auth`
 * và `shared/favorite`: luồng thiết kế ghi vào, chatbox đọc ra.
 */
export { useChatContextStore } from './chat-context.store'
export { usePublishChatContext } from './use-publish-chat-context'
export type { ChatContextStore, ChatFlow, ProjectChatContext } from './chat-context.types'

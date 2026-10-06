/** Public API of the `chatbot` feature. */
export { chatbotApi } from './api/chatbot.api'
export { ChatPanel } from './components/chat-panel'
export { ProactiveChatStream } from './components/proactive-chat-stream'
export { useChat } from './hooks/use-chat'
export { useProactiveChat } from './hooks/use-proactive-chat'
export { proactiveScript, scriptKey, type ProactiveLine } from './services/proactive.service'
export { useChatbotStore } from './store/chatbot.store'
export type { ChatMessage } from './types/chatbot.types'

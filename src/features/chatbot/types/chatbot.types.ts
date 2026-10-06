/** A single chat message in the assistant conversation. */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
  /** Câu AI tự nói trong lúc chờ (mục III.3a) — không tính vào hạn mức ngày. */
  proactive?: boolean
}

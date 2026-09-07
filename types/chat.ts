export interface Conversation {
  id: string;
  participant1: string;
  participant2: string;
  listing_id: string | null;
  sitter_listing_id: string | null;
  is_unlocked: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

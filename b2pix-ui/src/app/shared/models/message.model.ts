export type MessageSourceType = 'pix_order' | 'sell_order';

export type MessageSenderRole = 'buyer' | 'seller' | 'moderator';

export interface MessageResponse {
  id: string;
  source_type: MessageSourceType;
  source_id: string;
  sender_role: MessageSenderRole;
  content: string;
  created_at: string;
}

export interface PaginatedMessagesResponse {
  items: MessageResponse[];
  page: number;
  limit: number;
  has_more: boolean;
}

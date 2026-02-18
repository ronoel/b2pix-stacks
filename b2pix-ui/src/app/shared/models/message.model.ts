export type MessageSourceType = 'pix_order' | 'sell_order';

export type MessageSenderRole = 'customer' | 'payer' | 'moderator';

export interface MessageResponse {
  id: string;
  source_type: MessageSourceType;
  source_id: string;
  sender_role: MessageSenderRole;
  content: string;
  read_by_customer: boolean;
  read_by_payer: boolean;
  read_by_moderator: boolean;
  created_at: string;
}

export interface PaginatedMessagesResponse {
  items: MessageResponse[];
  page: number;
  limit: number;
  has_more: boolean;
}

export interface MarkAsReadResponse {
  modified_count: number;
}

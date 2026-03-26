export interface PixInboundRequestResponse {
  id: string;
  source_type: string;           // 'buy_order' | 'invoice'
  source_id: string;             // ObjectId of the source entity
  lp_address: string;
  pix_key: string;
  value_brl: number;             // BRL in cents
  pix_end_to_end_id: string | null;
  status: string;                // 'created' | 'processing' | 'analyzing' | 'confirmed' | 'rejected' | 'expired'
  is_final: boolean;
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

export function getPixInboundStatusLabel(status: string): string {
  switch (status) {
    case 'created': return 'Aguardando Pagamento';
    case 'processing': return 'Verificando';
    case 'analyzing': return 'Em Análise';
    case 'confirmed': return 'Confirmado';
    case 'rejected': return 'Rejeitado';
    case 'expired': return 'Expirado';
    default: return status;
  }
}

export function getPixInboundStatusClass(status: string): string {
  switch (status) {
    case 'confirmed': return 'completed';
    case 'processing':
    case 'analyzing': return 'processing';
    case 'created': return 'pending';
    case 'rejected':
    case 'expired': return 'warning';
    default: return 'pending';
  }
}

export function getSourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case 'buy_order': return 'Compra';
    case 'invoice': return 'Cobrança';
    default: return sourceType;
  }
}

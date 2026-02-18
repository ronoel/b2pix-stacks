export function buildSendMessagePayload(
  sourceType: string,
  sourceId: string,
  content: string,
  messageIdsToMarkAsRead: string[] = []
): string {
  const timestamp = new Date().toISOString();
  const readIds = messageIdsToMarkAsRead.length > 0
    ? messageIdsToMarkAsRead.join(',')
    : 'NONE';
  return `B2PIX - Enviar Mensagem\nb2pix.org\n${sourceType}:${sourceId}\n${content}\n${readIds}\n${timestamp}`;
}

export function buildDisputePayload(payoutRequestId: string): string {
  const timestamp = new Date().toISOString();
  return `B2PIX - Disputar Payout Request\nb2pix.org\n${payoutRequestId}\n${timestamp}`;
}

export function buildMarkAsReadPayload(
  sourceType: string,
  sourceId: string,
  messageIds: string[]
): string {
  const timestamp = new Date().toISOString();
  return `B2PIX - Marcar Mensagens como Lidas\nb2pix.org\n${sourceType}:${sourceId}\n${messageIds.join(',')}\n${timestamp}`;
}

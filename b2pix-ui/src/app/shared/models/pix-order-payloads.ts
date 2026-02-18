export function buildSendMessagePayload(sourceType: string, sourceId: string, content: string): string {
  const timestamp = new Date().toISOString();
  return `B2PIX - Enviar Mensagem\nb2pix.org\n${sourceType}:${sourceId}\n${content}\n${timestamp}`;
}

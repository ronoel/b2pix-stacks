import { Component, inject, input, signal, computed, OnInit, OnDestroy, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { MessageService } from '../../../../shared/api/message.service';
import { MessageResponse, MessageSenderRole } from '../../../../shared/models/message.model';

@Component({
  selector: 'app-message-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './message-chat.component.html',
  styleUrl: './message-chat.component.scss'
})
export class MessageChatComponent implements OnInit, OnDestroy {
  sourceType = input.required<string>();
  sourceId = input.required<string>();
  currentUserRole = input<MessageSenderRole | null>(null);
  readOnly = input(false);

  private messageService = inject(MessageService);
  private pollingSubscription?: Subscription;
  private readonly POLL_INTERVAL = 10000;

  messagesContainer = viewChild<ElementRef>('messagesContainer');

  messages = signal<MessageResponse[]>([]);
  isLoadingMessages = signal(false);
  isSendingMessage = signal(false);
  isMarkingAsRead = signal(false);
  messageText = signal('');
  messageError = signal<string | null>(null);
  hasMore = signal(false);
  currentPage = signal(1);

  canSend = computed(() => {
    return !this.readOnly()
      && this.currentUserRole() !== null
      && this.messageText().trim().length > 0
      && this.messageText().length <= 1000
      && !this.isSendingMessage();
  });

  charCount = computed(() => this.messageText().length);

  unreadMessageIds = computed(() => {
    const role = this.currentUserRole();
    if (!role) return [];
    return this.messages()
      .filter(msg => {
        if (role === 'customer') return !msg.read_by_customer;
        if (role === 'payer') return !msg.read_by_payer;
        if (role === 'moderator') return !msg.read_by_moderator;
        return false;
      })
      .map(msg => msg.id);
  });

  unreadCount = computed(() => this.unreadMessageIds().length);

  ngOnInit() {
    this.loadMessages();
    if (!this.readOnly()) {
      this.startPolling();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  loadMessages(): void {
    this.isLoadingMessages.set(true);
    this.messageService.listMessages(this.sourceType(), this.sourceId(), 1, 50).subscribe({
      next: (response) => {
        this.messages.set(response.items);
        this.hasMore.set(response.has_more);
        this.currentPage.set(1);
        this.isLoadingMessages.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.isLoadingMessages.set(false);
      }
    });
  }

  loadMoreMessages(): void {
    const nextPage = this.currentPage() + 1;
    this.messageService.listMessages(this.sourceType(), this.sourceId(), nextPage, 50).subscribe({
      next: (response) => {
        this.messages.update(msgs => [...msgs, ...response.items]);
        this.hasMore.set(response.has_more);
        this.currentPage.set(nextPage);
      }
    });
  }

  sendMessage(): void {
    const content = this.messageText().trim();
    if (!content || !this.currentUserRole()) return;

    this.isSendingMessage.set(true);
    this.messageError.set(null);

    const unreadIds = this.unreadMessageIds();

    this.messageService.sendMessage(this.sourceType(), this.sourceId(), content, unreadIds).subscribe({
      next: (message) => {
        this.messages.update(msgs => [...msgs, message]);
        this.messageText.set('');
        this.isSendingMessage.set(false);
        this.scrollToBottom();
        // Update local read status for messages marked via send
        if (unreadIds.length > 0) {
          this.updateLocalReadStatus(unreadIds);
        }
      },
      error: (error) => {
        this.isSendingMessage.set(false);
        const status = error?.status;
        if (status === 403) {
          this.messageError.set('Você não participa desta conversa');
        } else if (status === 400) {
          const msg = error?.error?.message || error?.message || '';
          if (msg.includes('empty') || msg.includes('vazio')) {
            this.messageError.set('Mensagem não pode ser vazia');
          } else if (msg.includes('1000') || msg.includes('long')) {
            this.messageError.set('Mensagem excede o limite de 1000 caracteres');
          } else {
            this.messageError.set(msg || 'Erro ao enviar mensagem');
          }
        } else if (error?.message === 'Assinatura cancelada pelo usuário') {
          this.messageError.set('Assinatura cancelada');
        } else {
          this.messageError.set('Erro ao enviar mensagem');
        }
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.canSend()) {
        this.sendMessage();
      }
    }
  }

  isOwnMessage(message: MessageResponse): boolean {
    return message.sender_role === this.currentUserRole();
  }

  isMessageUnread(message: MessageResponse): boolean {
    const role = this.currentUserRole();
    if (!role) return false;
    if (role === 'customer') return !message.read_by_customer;
    if (role === 'payer') return !message.read_by_payer;
    if (role === 'moderator') return !message.read_by_moderator;
    return false;
  }

  getRoleLabel(role: MessageSenderRole): string {
    switch (role) {
      case 'customer': return 'Comprador';
      case 'payer': return 'Pagador';
      case 'moderator': return 'Moderador';
      default: return role;
    }
  }

  formatTime(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  markAllAsRead(): void {
    const ids = this.unreadMessageIds();
    if (ids.length === 0 || this.readOnly() || !this.currentUserRole() || this.isMarkingAsRead()) return;

    this.isMarkingAsRead.set(true);
    this.messageService.markMessagesAsRead(this.sourceType(), this.sourceId(), ids).subscribe({
      next: () => {
        this.updateLocalReadStatus(ids);
        this.isMarkingAsRead.set(false);
      },
      error: (err) => {
        console.error('Error marking messages as read:', err);
        this.isMarkingAsRead.set(false);
      }
    });
  }

  private updateLocalReadStatus(ids: string[]): void {
    const role = this.currentUserRole();
    if (!role) return;

    const readKey = `read_by_${role}` as keyof MessageResponse;
    this.messages.update(msgs => msgs.map(msg => {
      if (ids.includes(msg.id)) {
        return { ...msg, [readKey]: true };
      }
      return msg;
    }));
  }

  private startPolling(): void {
    this.pollingSubscription = interval(this.POLL_INTERVAL).subscribe(() => {
      this.messageService.listMessages(this.sourceType(), this.sourceId(), 1, 50).subscribe({
        next: (response) => {
          const previousCount = this.messages().length;
          this.messages.set(response.items);
          this.hasMore.set(response.has_more);
          if (response.items.length > previousCount) {
            this.scrollToBottom();
          }
        }
      });
    });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer();
      if (container) {
        container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      }
    }, 50);
  }
}

import { Component, inject, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
import { BankAccountService } from '../../shared/api/bank-account.service';
import { firstValueFrom } from 'rxjs';

interface BankCredentials {
  clientId: string;
  clientSecret: string;
  certificateFile: File | null;
}

interface SetupResult {
  success: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-bank-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bank-setup.component.html',
  styleUrls: ['./bank-setup.component.scss']
})
export class BankSetupComponent {
  protected loadingService = inject(LoadingService);
  private bankAccountService = inject(BankAccountService);

  currentStep = 1;
  credentials: BankCredentials = {
    clientId: '',
    clientSecret: '',
    certificateFile: null
  };

  setupResult: SetupResult | null = null;

  @Output() setupComplete = new EventEmitter<BankCredentials>();
  @Output() setupCancelled = new EventEmitter<void>();
  @Output() setupSuccess = new EventEmitter<BankCredentials>();

  openBankApp() {
    window.open('https://sejaefi.com.br/', '_blank');
  }

  nextStep() {
    if (this.currentStep < 4) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      // Se estamos na primeira etapa, emite o evento para cancelar o setup
      this.setupCancelled.emit();
    }
  }

  onCertificateSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.credentials.certificateFile = file;
    }
  }

  triggerFileInput(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const fileInput = document.getElementById('certificate') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  clearResult() {
    this.setupResult = null;
    this.currentStep = 3; // Go back to the review step
  }

  restartSetup() {
    this.setupResult = null;
    this.currentStep = 1;
    // Optionally clear credentials
    this.credentials = {
      clientId: '',
      clientSecret: '',
      certificateFile: null
    };
  }

  closeSetup() {
    if (this.setupResult && this.setupResult.type === 'success') {
      // Emit success event for successful completion
      this.setupSuccess.emit(this.credentials);
    } else {
      // Emit regular complete event for other cases
      this.setupComplete.emit(this.credentials);
    }
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  maskCredential(credential: string): string {
    if (!credential) return '';
    if (credential.length <= 8) return '*'.repeat(credential.length);
    return credential.substring(0, 4) + '*'.repeat(credential.length - 8) + credential.substring(credential.length - 4);
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:application/x-pkcs12;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        } catch (error) {
          reject(new Error('Erro ao processar o arquivo do certificado'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo do certificado'));
      reader.readAsDataURL(file);
    });
  }

  async submitCredentials() {
    if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.certificateFile) {
      this.setupResult = {
        success: false,
        type: 'error',
        message: '📝 <strong>ERRO: Campos obrigatórios</strong>\n\nPor favor, preencha todos os campos obrigatórios:\n\n• Client ID\n• Client Secret\n• Arquivo de certificado (.p12)\n\n<strong>💡 DICA:</strong> Volte às etapas anteriores e complete todas as informações.'
      };
      this.currentStep = 4;
      return;
    }

    // Validate certificate file extension
    if (!this.credentials.certificateFile.name.toLowerCase().endsWith('.p12')) {
      this.setupResult = {
        success: false,
        type: 'error',
        message: '📜 <strong>ERRO: Tipo de arquivo incorreto</strong>\n\nO arquivo de certificado deve ter extensão .p12\n\n<strong>📋 VERIFIQUE:</strong>\n• Se você baixou o arquivo correto do aplicativo EFI\n• Se o arquivo não foi renomeado\n• Se a extensão está correta (.p12)\n\n<strong>💡 DICA:</strong> Baixe novamente o certificado do aplicativo EFI se necessário.'
      };
      this.currentStep = 4;
      return;
    }

    // Clear any previous results
    this.setupResult = null;
    this.loadingService.show();

    try {
      // Convert certificate to base64
      const certificateBase64 = await this.convertFileToBase64(this.credentials.certificateFile);
      
      // Complete bank setup with both credentials and certificate
      await firstValueFrom(
        this.bankAccountService.setupBank(
          this.credentials.clientId,
          this.credentials.clientSecret,
          certificateBase64,
          this.credentials.certificateFile.name
        )
      );

      // Success
      this.setupResult = {
        success: true,
        type: 'success',
        message: '🎉 Configuração bancária realizada com sucesso!\n\nSeu sistema PIX está agora configurado e pronto para uso.'
      };
      
      // Navigate to result step
      this.currentStep = 4;
      
    } catch (error: any) {
      console.error('Error setting up bank configuration:', error);
      
      // Handle different types of errors
      if (error.status === 400 && error.error?.error) {
        this.handleBankSetupError(error.error.error);
      } else if (error.status === 400) {
        this.setupResult = {
          success: false,
          type: 'error',
          message: '❌ <strong>ERRO: Dados inválidos</strong>\n\nOs dados fornecidos não estão corretos. Verifique:\n\n• As credenciais Client ID e Client Secret\n• Se o arquivo de certificado é válido (.p12)\n• Se todos os campos foram preenchidos corretamente\n\n<strong>💡 DICA:</strong> Volte às etapas anteriores e confirme se copiou corretamente as credenciais do aplicativo EFI.'
        };
      } else if (error.status === 401) {
        this.setupResult = {
          success: false,
          type: 'error',
          message: '🔐 <strong>ERRO: Problema de autenticação</strong>\n\nNão foi possível validar sua identidade no sistema.\n\n<strong>📋 O QUE FAZER:</strong>\n1. Faça logout e login novamente na aplicação\n2. Verifique se sua carteira está conectada\n3. Tente realizar a configuração novamente'
        };
      } else if (error.status === 500) {
        this.setupResult = {
          success: false,
          type: 'error',
          message: '🛠️ <strong>ERRO: Problema no servidor</strong>\n\nOcorreu um erro interno no sistema.\n\n<strong>📋 O QUE FAZER:</strong>\n1. Aguarde alguns minutos\n2. Tente realizar a configuração novamente\n3. Se o problema persistir, entre em contato com o suporte'
        };
      } else {
        this.setupResult = {
          success: false,
          type: 'error',
          message: '⚠️ <strong>ERRO: Falha na configuração</strong>\n\nNão foi possível completar a configuração do sistema bancário.\n\n<strong>📋 VERIFIQUE:</strong>\n• Se sua conexão com a internet está estável\n• Se as credenciais estão corretas\n• Se o certificado é válido\n\n<strong>💡 DICA:</strong> Refaça o processo desde o início, verificando cada passo cuidadosamente.'
        };
      }
      
      // Navigate to result step for all error cases
      this.currentStep = 4;
    } finally {
      this.loadingService.hide();
    }
  }

  private handleBankSetupError(errorMessage: string) {
    if (errorMessage.includes('missing required scopes')) {
      this.showScopesError(errorMessage);
    } else if (errorMessage.includes('Certificate must be a .p12 file')) {
      this.setupResult = {
        success: false,
        type: 'error',
        message: '📜 <strong>ERRO: Problema no certificado</strong>\n\nO arquivo de certificado não é válido.\n\n<strong>📋 VERIFIQUE:</strong>\n• Se o arquivo tem extensão .p12\n• Se o certificado foi baixado corretamente do aplicativo EFI\n• Se o arquivo não está corrompido\n\n<strong>💡 COMO CORRIGIR:</strong>\n1. Volte ao aplicativo EFI\n2. Baixe novamente o certificado\n3. Certifique-se de que o arquivo tem extensão .p12\n4. Faça o upload do novo arquivo'
      };
    } else if (errorMessage.includes('EFI Pay authentication failed') || errorMessage.includes('Invalid or inactive credentials') || errorMessage.includes('invalid_client')) {
      this.setupResult = {
        success: false,
        type: 'error',
        message: '🔑 <strong>ERRO: Credenciais inválidas</strong>\n\nAs credenciais fornecidas não estão corretas ou estão inativas.\n\n<strong>📋 POSSÍVEIS CAUSAS:</strong>\n• Client ID ou Client Secret incorretos\n• Credenciais copiadas de forma incompleta\n• Credenciais expiraram ou foram revogadas\n\n<strong>💡 COMO CORRIGIR:</strong>\n1. Volte ao aplicativo EFI\n2. Vá em API → Aplicações → B2PIX\n3. Verifique se a aplicação está ativa\n4. Copie novamente as credenciais (Client ID e Client Secret)\n5. Cole cuidadosamente nos campos, sem espaços extras'
      };
    } else {
      this.setupResult = {
        success: false,
        type: 'error',
        message: `⚠️ <strong>ERRO: Falha na configuração bancária</strong>\n\n${errorMessage}\n\n<strong>📋 O QUE FAZER:</strong>\n• Verifique se as credenciais estão corretas\n• Confirme se o certificado é válido\n• Tente realizar a configuração novamente\n• Se o problema persistir, entre em contato com o suporte`
      };
    }
  }

  private showScopesError(errorMessage: string) {
    // Parse the error message to extract required and granted scopes
    const requiredMatch = errorMessage.match(/Required: \[(.*?)\]/);
    const grantedMatch = errorMessage.match(/Granted: '(.*?)'/);
    
    const requiredScopes = requiredMatch ? requiredMatch[1].split(', ').map(s => s.trim()) : [];
    const grantedScopes = grantedMatch ? grantedMatch[1].split(' ').filter(s => s.trim()) : [];
    
    // Map scopes to user-friendly names
    const scopeMap: { [key: string]: string } = {
      'pix.read': '✓ Consultar Pix',
      'gn.pix.send.read': '✓ Consultar pix enviado',
      'gn.pix.evp.read': '✓ Consultar Chaves aleatórias',
      'gn.pix.evp.write': '✓ Alterar Chaves aleatórias'
    };

    let message = '🚫 <strong>ERRO: Permissões insuficientes na API PIX</strong>\n\n';
    message += 'Você precisa configurar as seguintes permissões no aplicativo EFI:\n\n';
    
    // Show all required permissions and mark which ones are missing
    requiredScopes.forEach(scope => {
      const scopeName = scopeMap[scope] || scope;
      const isGranted = grantedScopes.includes(scope);
      if (isGranted) {
        message += `${scopeName} ✅\n`;
      } else {
        message += `${scopeName} ❌ <strong>FALTANDO</strong>\n`;
      }
    });

    message += '\n<strong>📋 COMO CORRIGIR:</strong>\n';
    message += '1. Volte ao aplicativo web do Banco EFI\n';
    message += '2. Vá em API → Aplicações → B2PIX\n';
    message += '3. Edite a aplicação e marque TODAS as permissões:\n';
    message += '   • Consultar Pix\n';
    message += '   • Consultar pix enviado\n';
    message += '   • Alterar Chaves aleatórias\n';
    message += '   • Consultar Chaves aleatórias\n';
    message += '4. Salve as alterações\n';
    message += '5. Tente novamente a configuração';

    this.setupResult = {
      success: false,
      type: 'warning',
      message: message
    };
  }
}


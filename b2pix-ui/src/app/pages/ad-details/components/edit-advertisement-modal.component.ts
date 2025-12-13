import { Component, input, output, ViewEncapsulation, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Advertisement, PricingMode } from '../../../shared/models/advertisement.model';

export interface EditAdvertisementData {
  pricingMode: PricingMode;
  pricingValue: string;
  minAmount: number;
  maxAmount: number;
}

@Component({
  selector: 'app-edit-advertisement-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content edit-ad-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Editar Anúncio</h2>
          <button class="modal-close" (click)="onClose()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <form (ngSubmit)="onSubmit()" #editForm="ngForm">
            <div class="form-group">
              <label for="pricingMode" class="form-label">
                Tipo de Precificação
                <span class="required">*</span>
              </label>
              <select
                id="pricingMode"
                name="pricingMode"
                class="form-control"
                [(ngModel)]="formData.pricingMode"
                required
                (change)="onPricingModeChange()"
              >
                <option value="fixed">Preço Fixo</option>
                <option value="dynamic">Preço Dinâmico (% do mercado)</option>
              </select>
              <p class="form-help">
                @if (formData.pricingMode === 'fixed') {
                  Defina um preço fixo em reais por Bitcoin
                } @else {
                  Defina uma porcentagem acima ou abaixo do preço de mercado
                }
              </p>
            </div>

            <div class="form-group">
              <label for="pricingValue" class="form-label">
                @if (formData.pricingMode === 'fixed') {
                  Preço (R$ por BTC)
                } @else {
                  Percentual (%)
                }
                <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                @if (formData.pricingMode === 'fixed') {
                  <span class="input-prefix">R$</span>
                  <input
                    type="number"
                    id="pricingValue"
                    name="pricingValue"
                    class="form-control with-prefix"
                    [(ngModel)]="formData.pricingValue"
                    placeholder="500000"
                    step="0.01"
                    min="0"
                    required
                  />
                } @else {
                  <input
                    type="number"
                    id="pricingValue"
                    name="pricingValue"
                    class="form-control"
                    [(ngModel)]="formData.pricingValue"
                    placeholder="3.15"
                    step="0.01"
                    required
                  />
                  <span class="input-suffix">%</span>
                }
              </div>
              <p class="form-help">
                @if (formData.pricingMode === 'fixed') {
                  Exemplo: R$ 500.000,00 por Bitcoin
                } @else {
                  Exemplo: 3.15% acima do mercado ou -2.5% abaixo
                }
              </p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="minAmount" class="form-label">
                  Valor Mínimo
                  <span class="required">*</span>
                </label>
                <div class="input-wrapper">
                  <span class="input-prefix">R$</span>
                  <input
                    type="number"
                    id="minAmount"
                    name="minAmount"
                    class="form-control with-prefix"
                    [(ngModel)]="minAmountBRL"
                    placeholder="100.00"
                    step="0.01"
                    min="0.01"
                    required
                    (blur)="updateMinAmount()"
                  />
                </div>
                <p class="form-help">Valor mínimo da compra</p>
              </div>

              <div class="form-group">
                <label for="maxAmount" class="form-label">
                  Valor Máximo
                  <span class="required">*</span>
                </label>
                <div class="input-wrapper">
                  <span class="input-prefix">R$</span>
                  <input
                    type="number"
                    id="maxAmount"
                    name="maxAmount"
                    class="form-control with-prefix"
                    [(ngModel)]="maxAmountBRL"
                    placeholder="1000.00"
                    step="0.01"
                    min="0.01"
                    required
                    (blur)="updateMaxAmount()"
                  />
                </div>
                <p class="form-help">Valor máximo da compra</p>
              </div>
            </div>

            @if (validationError()) {
              <div class="alert alert-error">
                {{ validationError() }}
              </div>
            }

            <div class="form-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="8" r="1" fill="currentColor"/>
              </svg>
              <div>
                <strong>Importante:</strong> Esta ação requer assinatura da carteira para confirmar as alterações.
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" (click)="onClose()" [disabled]="isSubmitting()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="onSubmit()"
            [disabled]="!isFormValid() || isSubmitting()"
          >
            @if (isSubmitting()) {
              <div class="btn-spinner"></div>
              Salvando...
            } @else {
              Salvar Alterações
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .edit-ad-modal {
      max-width: 600px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    .modal-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }
    .modal-close {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #6B7280;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }
    .modal-close:hover {
      color: #1F2937;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .form-label .required {
      color: #EF4444;
      margin-left: 2px;
    }
    .form-control {
      width: 100%;
      padding: 12px;
      font-size: 14px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      background: white;
      color: #1F2937;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .form-control:focus {
      outline: none;
      border-color: #1E40AF;
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
    }
    .form-control:disabled {
      background: #F3F4F6;
      cursor: not-allowed;
    }
    .form-control.with-prefix {
      padding-left: 40px;
    }
    .form-control.with-suffix {
      padding-right: 40px;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-prefix {
      position: absolute;
      left: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #6B7280;
      pointer-events: none;
    }
    .input-suffix {
      position: absolute;
      right: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #6B7280;
      pointer-events: none;
    }
    .form-help {
      margin: 6px 0 0 0;
      font-size: 12px;
      color: #6B7280;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .form-info {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      font-size: 13px;
      color: #1E40AF;
      margin-top: 20px;
    }
    .form-info svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .form-info strong {
      font-weight: 600;
    }
    .alert {
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .alert-error {
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1D4ED8;
    }
    .btn-outline {
      background: transparent;
      color: #374151;
      border-color: #D1D5DB;
    }
    .btn-outline:hover:not(:disabled) {
      background: #F9FAFB;
    }
    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .modal-content {
        max-width: 100%;
        max-height: 95vh;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EditAdvertisementModalComponent implements OnInit {
  advertisement = input.required<Advertisement>();
  isSubmitting = input<boolean>(false);

  close = output<void>();
  save = output<EditAdvertisementData>();

  formData: EditAdvertisementData = {
    pricingMode: 'fixed',
    pricingValue: '',
    minAmount: 0,
    maxAmount: 0
  };

  minAmountBRL = 0;
  maxAmountBRL = 0;
  pricingValueBRL = 0; // For fixed mode display in BRL
  validationError = signal<string | null>(null);

  ngOnInit() {
    // Initialize form with current advertisement data
    const ad = this.advertisement();
    this.formData.pricingMode = ad.pricing_mode;

    // Convert pricing value - for fixed mode, convert cents to BRL for display
    if (ad.pricing_mode === 'fixed' && ad.price) {
      this.pricingValueBRL = ad.price / 100; // Convert cents to BRL
      this.formData.pricingValue = this.pricingValueBRL.toString();
    } else if (ad.pricing_mode === 'dynamic' && ad.percentage_offset !== undefined) {
      this.formData.pricingValue = ad.percentage_offset.toString();
    }

    // Convert cents to BRL for display
    this.formData.minAmount = ad.min_amount;
    this.formData.maxAmount = ad.max_amount;
    this.minAmountBRL = ad.min_amount / 100;
    this.maxAmountBRL = ad.max_amount / 100;
  }

  onPricingModeChange() {
    // Reset pricing value when mode changes
    this.formData.pricingValue = '';
    this.pricingValueBRL = 0;
    this.validationError.set(null);
  }

  updatePricingValue() {
    if (this.formData.pricingMode === 'fixed') {
      // For fixed mode, store the BRL value
      this.formData.pricingValue = this.pricingValueBRL.toString();
    }
    this.validateForm();
  }

  updateMinAmount() {
    this.formData.minAmount = Math.round(this.minAmountBRL * 100);
    this.validateForm();
  }

  updateMaxAmount() {
    this.formData.maxAmount = Math.round(this.maxAmountBRL * 100);
    this.validateForm();
  }

  validateForm(): boolean {
    this.validationError.set(null);

    // Validate min amount
    if (this.formData.minAmount <= 0) {
      this.validationError.set('O valor mínimo deve ser maior que zero');
      return false;
    }

    // Validate max amount
    if (this.formData.maxAmount <= 0) {
      this.validationError.set('O valor máximo deve ser maior que zero');
      return false;
    }

    // Validate max >= min
    if (this.formData.maxAmount < this.formData.minAmount) {
      this.validationError.set('O valor máximo deve ser maior ou igual ao valor mínimo');
      return false;
    }

    // Validate pricing value
    const pricingValue = parseFloat(this.formData.pricingValue);
    if (isNaN(pricingValue)) {
      this.validationError.set('Digite um valor válido para o preço');
      return false;
    }

    if (this.formData.pricingMode === 'fixed' && pricingValue <= 0) {
      this.validationError.set('O preço fixo deve ser maior que zero');
      return false;
    }

    return true;
  }

  isFormValid(): boolean {
    return this.formData.pricingValue !== '' &&
           this.formData.minAmount > 0 &&
           this.formData.maxAmount > 0 &&
           this.formData.maxAmount >= this.formData.minAmount;
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.validateForm() || this.isSubmitting()) {
      return;
    }

    // Convert pricingValue to cents if in fixed mode
    const dataToSave: EditAdvertisementData = {
      ...this.formData,
      pricingValue: this.formData.pricingMode === 'fixed'
        ? (parseFloat(this.formData.pricingValue) * 100).toString()
        : this.formData.pricingValue
    };

    this.save.emit(dataToSave);
  }
}

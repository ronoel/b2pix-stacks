import { Component, input } from '@angular/core';

@Component({
  selector: 'app-bridge-step-indicator',
  standalone: true,
  template: `
    <div class="step-dots">
      @for (label of stepLabels(); track $index; let i = $index) {
        @if (i > 0) {
          <div class="step-connector" [class.done]="i <= currentStep()"></div>
        }
        <div class="step-dot"
          [class.step-done]="i < currentStep()"
          [class.step-active]="i === currentStep()"
          [class.step-pending]="i > currentStep()"
          [attr.title]="label">
        </div>
      }
    </div>
  `,
})
export class BridgeStepIndicatorComponent {
  currentStep = input.required<number>();
  stepLabels = input.required<string[]>();
}

import { Component, inject } from '@angular/core';
import { ApiHealthService } from '../../services/api-health.service';

@Component({
  selector: 'app-api-unavailable',
  standalone: true,
  imports: [],
  templateUrl: './api-unavailable.component.html',
  styleUrl: './api-unavailable.component.scss'
})
export class ApiUnavailableComponent {
  protected apiHealth = inject(ApiHealthService);
}

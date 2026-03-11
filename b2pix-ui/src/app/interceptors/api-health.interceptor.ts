import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, catchError, throwError } from 'rxjs';
import { ApiHealthService, SKIP_API_HEALTH_CHECK } from '../services/api-health.service';
import { environment } from '../../environments/environment';

function isB2pixApiRequest(url: string): boolean {
  const apiUrl = environment.apiUrl;
  if (url.startsWith(apiUrl)) return true;
  // Match relative /api paths even when environment uses absolute URL
  if (url.includes('/api/v1/')) return true;
  return false;
}

export const apiHealthInterceptor: HttpInterceptorFn = (req, next) => {
  const apiHealth = inject(ApiHealthService);

  if (!isB2pixApiRequest(req.url)) {
    return next(req);
  }

  if (req.context.get(SKIP_API_HEALTH_CHECK)) {
    return next(req);
  }

  return next(req).pipe(
    tap(() => {
      apiHealth.reportSuccess();
    }),
    catchError(error => {
      const status = error.status;
      if (status === 0 || status === 408 || (status >= 500 && status <= 599)) {
        apiHealth.reportFailure();
      }
      return throwError(() => error);
    })
  );
};

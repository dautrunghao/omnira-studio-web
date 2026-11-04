import { Component, ViewEncapsulation } from '@angular/core';
import { AuthGateComponent } from './layout/auth-gate.component';
import { UI_KIT_CSS } from './shared/ui-kit.css';

/** Gốc ứng dụng: nạp UI kit toàn cục rồi chuyển cho AuthGate (Login → LicenseGate → AppShell). */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthGateComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [UI_KIT_CSS],
  template: `<omni-auth-gate />`,
})
export class AppComponent {}

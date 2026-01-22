import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CustomersService, Customer, CustomerInvoicing } from '../service/customers.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  filtered: Customer[] = [];
  q: string = '';

  editing: Customer | null = null;
  form: Customer = { nombreCompleto: '' };

  selectedId: number | null = null;
  invoicing: CustomerInvoicing = {};

  loading = false;
  saving = false;
  saveMessage = '';
  saveError = '';

  // Opciones SAT comunes
  usoCfdiOptions = [
    { code: 'G03', label: 'Gastos en general' },
    { code: 'S01', label: 'Sin efectos fiscales' },
    { code: 'G01', label: 'Adquisición de mercancías' },
    { code: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
    { code: 'I04', label: 'Equipo de cómputo y accesorios' }
  ];

  regimenOptions = [
    { code: '601', label: 'General de Ley PM' },
    { code: '603', label: 'PM con Fines No Lucrativos' },
    { code: '612', label: 'PF con Actividades Empresariales y Profesionales' },
    { code: '626', label: 'Régimen Simplificado de Confianza' },
    { code: '605', label: 'Sueldos y Salarios e Ingresos Asimilados' },
    { code: '616', label: 'Sin obligaciones fiscales' }
  ];

  constructor(private api: CustomersService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (list) => { 
        this.customers = list; 
        this.applyFilter();
        // Si hay un cliente seleccionado, actualizar sus datos sin hacer scroll
        if (this.selectedId) {
          const updated = this.customers.find(c => c.id === this.selectedId);
          if (updated && updated.id) {
            this.selectedId = updated.id;
            this.form = { 
              id: updated.id, 
              nombreCompleto: updated.nombreCompleto, 
              email: updated.email, 
              telefono: updated.telefono, 
              domicilio: (updated as any).domicilio, 
              rfc: (updated as any).rfc, 
              razonSocial: (updated as any).razonSocial, 
              regimenFiscal: (updated as any).regimenFiscal, 
              usoCfdi: (updated as any).usoCfdi, 
              codigoPostal: (updated as any).codigoPostal
            } as any;
            this.invoicing = { 
              rfc: (updated as any).rfc, 
              razonSocial: (updated as any).razonSocial, 
              regimenFiscal: (updated as any).regimenFiscal, 
              usoCfdi: (updated as any).usoCfdi, 
              codigoPostal: (updated as any).codigoPostal 
            };
          }
        }
      },
      error: () => {},
      complete: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    const q = (this.q || '').toLowerCase();
    this.filtered = this.customers.filter(c =>
      !q || (c.nombreCompleto?.toLowerCase().includes(q)) || (c.email?.toLowerCase().includes(q)) || (c.telefono?.toLowerCase().includes(q))
    );
  }

  newCustomer(): void {
    this.editing = null;
    this.form = { nombreCompleto: '', email: '', telefono: '', domicilio: '', rfc: '', razonSocial: '', regimenFiscal: '', usoCfdi: '', codigoPostal: '' } as any;
  }

  editCustomer(c: Customer): void {
    this.cleanupBackdrops();
    this.editing = c;
    this.form = { id: c.id, nombreCompleto: c.nombreCompleto, email: c.email, telefono: c.telefono, domicilio: (c as any).domicilio, rfc: (c as any).rfc, razonSocial: (c as any).razonSocial, regimenFiscal: (c as any).regimenFiscal, usoCfdi: (c as any).usoCfdi, codigoPostal: (c as any).codigoPostal } as any;
    // ya no consultamos /invoicing; los campos viven en Cliente
  }

  save(): void {
    this.saveMessage = '';
    this.saveError = '';
    // Sanitizar RFC vacío -> null para evitar conflictos de índice único parcial
    if ((this.form as any).rfc !== undefined) {
      const r = (this.form as any).rfc;
      (this.form as any).rfc = (typeof r === 'string' && r.trim() === '') ? null : r?.toString()?.trim();
    }
    // Normalizar campos fiscales a formatos válidos/cortos
    (this.form as any).usoCfdi = this.normalizeUsoCfdi((this.form as any).usoCfdi);
    (this.form as any).regimenFiscal = this.normalizeRegimenFiscal((this.form as any).regimenFiscal);
    (this.form as any).codigoPostal = this.normalizeCp((this.form as any).codigoPostal);
    const req = this.form.id ? this.api.update(this.form.id, this.form) : this.api.create(this.form);
    this.saving = true;
    const savedIdBefore = this.form.id;
    req.subscribe({
      next: (saved) => {
        const savedId = (saved as any)?.id ?? this.form.id;
        this.hideModal();
        this.saveMessage = 'Cliente guardado correctamente.';
        // Recargar datos y luego seleccionar el cliente guardado
        this.loading = true;
        this.api.list().subscribe({
          next: (list) => {
            this.customers = list;
            this.applyFilter();
            // Seleccionar el cliente guardado
            const customerToSelect = this.customers.find(c => c.id === savedId);
            if (customerToSelect) {
              this.selectedId = savedId;
              this.form = { 
                id: customerToSelect.id, 
                nombreCompleto: customerToSelect.nombreCompleto, 
                email: customerToSelect.email, 
                telefono: customerToSelect.telefono, 
                domicilio: (customerToSelect as any).domicilio, 
                rfc: (customerToSelect as any).rfc, 
                razonSocial: (customerToSelect as any).razonSocial, 
                regimenFiscal: (customerToSelect as any).regimenFiscal, 
                usoCfdi: (customerToSelect as any).usoCfdi, 
                codigoPostal: (customerToSelect as any).codigoPostal
              } as any;
              this.invoicing = { 
                rfc: (customerToSelect as any).rfc, 
                razonSocial: (customerToSelect as any).razonSocial, 
                regimenFiscal: (customerToSelect as any).regimenFiscal, 
                usoCfdi: (customerToSelect as any).usoCfdi, 
                codigoPostal: (customerToSelect as any).codigoPostal 
              };
              // Hacer scroll al panel de detalles después de que se renderice
              setTimeout(() => {
                const panel = document.querySelector('.customer-details-panel');
                if (panel) {
                  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }, 200);
            }
          },
          error: () => {},
          complete: () => { this.loading = false; }
        });
      },
      error: (err) => {
        console.error('Error al guardar cliente:', err);
        this.saveError = 'Ocurrió un error al guardar el cliente. Intenta nuevamente.';
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  remove(c: Customer): void {
    if (!c.id) return;
    if (!confirm('¿Eliminar cliente?')) return;
    this.api.remove(c.id).subscribe(() => this.load());
  }

  select(c: Customer): void {
    if (!c.id) return;
    if (this.selectedId === c.id) {
      this.selectedId = null;
      this.invoicing = {};
      this.form = { nombreCompleto: '' };
      return;
    }
    this.selectedId = c.id;
    this.form = { id: c.id, nombreCompleto: c.nombreCompleto, email: c.email, telefono: c.telefono, domicilio: (c as any).domicilio, rfc: (c as any).rfc, razonSocial: (c as any).razonSocial, regimenFiscal: (c as any).regimenFiscal, usoCfdi: (c as any).usoCfdi, codigoPostal: (c as any).codigoPostal } as any;
    this.invoicing = { rfc: (c as any).rfc, razonSocial: (c as any).razonSocial, regimenFiscal: (c as any).regimenFiscal, usoCfdi: (c as any).usoCfdi, codigoPostal: (c as any).codigoPostal };
    
    // Hacer scroll al panel de detalles después de un breve delay para que se renderice
    setTimeout(() => {
      const panel = document.querySelector('.customer-details-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  saveBasic(): void {
    if (!this.selectedId) return;
    this.api.update(this.selectedId, this.form).subscribe(() => this.load());
  }

  saveInvoicing(): void { /* ya unificado en Cliente */ }

  private hideModal(): void {
    const el = document.getElementById('custModal') as HTMLElement | null;
    if (!el) return;
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active) { active.blur(); }
      const bs = (window as any).bootstrap;
      if (bs?.Modal) {
        const inst = bs.Modal.getOrCreateInstance(el);
        inst.hide();
      } else {
        // Fallback sin Bootstrap JS
        setTimeout(() => {
          el.classList.remove('show');
          el.setAttribute('aria-hidden', 'true');
          (el as HTMLElement).style.display = 'none';
        }, 0);
      }
    } finally {
      setTimeout(() => {
        document.body.classList.remove('modal-open');
        (document.body as any).style?.removeProperty?.('padding-right');
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        (document.querySelector('body') as HTMLElement)?.focus?.();
      }, 0);
    }
  }

  private cleanupBackdrops(): void {
    document.body.classList.remove('modal-open');
    (document.body as any).style?.removeProperty?.('padding-right');
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
  }

  private normalizeUsoCfdi(val: any): string | null {
    const t = (val ?? '').toString().trim().toUpperCase();
    if (!t) return null;
    // Si ya es un código válido de 3 caracteres (SAT), se conserva
    if (/^[A-Z0-9]{3}$/.test(t)) return t;
    // Mapeos comunes por texto
    if (t.includes('GAST')) return 'G03'; // Gastos en general
    if (t.includes('SIN') || t === 'NA' || t === 'N/A') return 'S01'; // Sin efectos fiscales
    return null; // Evitar overflow en BD, lo marcamos como no definido
  }

  private normalizeRegimenFiscal(val: any): string | null {
    const t = (val ?? '').toString().trim().toUpperCase();
    if (!t) return null;
    // Códigos SAT de régimen fiscal suelen ser 3 dígitos
    if (/^\d{3}$/.test(t)) return t;
    return null;
  }

  private normalizeCp(val: any): string | null {
    const t = (val ?? '').toString().trim();
    if (/^\d{5}$/.test(t)) return t;
    return null;
  }
}



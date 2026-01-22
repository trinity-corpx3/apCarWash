import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
//import { TabViewModule } from 'primeng/tabview';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
declare var bootstrap: any;  // Importar bootstrap para controlar el modal

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterOutlet, CommonModule ,RouterModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent {
  title = 'Categories'; 
  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}
  displayModal: boolean = false; // Variable para controlar la visibilidad del modal
  // Show the receipt modals
    showAddModal(): void {
    const addCategoriesModal = new bootstrap.Modal(document.getElementById('addCategoriesModal'));
    addCategoriesModal.show();
    }
    showEditModal(): void {
    const editCategoriesModal = new bootstrap.Modal(document.getElementById('editCategoriesModal'));
    editCategoriesModal.show();
    }
    showDeleteModal(): void {
    const deleteCategoriesModal = new bootstrap.Modal(document.getElementById('deleteCategoriesModal'));
    deleteCategoriesModal.show();
    }
}

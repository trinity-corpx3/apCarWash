import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel support
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { environment } from '../../environments/environment';  // Importa el entorno
declare var bootstrap: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterModule, FormsModule, SidebarComponent], // Add FormsModule for handling form inputs
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css']
})
export class EmployeesComponent implements OnInit {
  title = 'Employees';

  employees: any[] = []; // Store the list of employees
  newEmployee: any = {};  // Store new employee data for creation
  selectedEmployee: any = {
    nombreCompleto: '',
    username: '',
    email: '',
    rol: { nombre: '' },
    password: '',
    activo: true  // Inicializa como true o false
  };
  
  loading: boolean = false;
  sucursalName: string = ''; // Nombre de la sucursal
  roles: any[] = [];  // Add the roles property to define employee roles

  private apiUrl = environment.apiUrl;  // Usa la URL base del entorno

  showUserDropdown = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
  
    if (!currentUser) {
      this.router.navigate(['/login']); // Redirigir si no está autenticado
      return;
    }
  
    // Obtener el ID de la sucursal asignada al usuario actual
    const sucursalId = this.authService.getSucursalId();
    if (!sucursalId) {
      console.error('Sucursal ID no encontrado. No se puede cargar el nombre de la sucursal.');
      Swal.fire('Error', 'No se pudo determinar la sucursal asignada.', 'error');
      return;
    }
  
    // Obtener el nombre de la sucursal
    this.authService.getSucursalNombre(sucursalId).subscribe({
      next: (response: any) => {
        this.sucursalName = response.nombre || 'Sucursal no encontrada';
        console.log('Nombre de la sucursal:', this.sucursalName);
  
        // Cargar empleados y roles para la sucursal
        this.fetchEmployees(sucursalId); // Pasa el ID de la sucursal al método
        this.fetchRoles();
      },
      error: (error) => {
        console.error('Error al obtener el nombre de la sucursal:', error);
        Swal.fire('Error', 'No se pudo obtener el nombre de la sucursal.', 'error');
      },
    });
  }
  
  

  

  
  logout(): void {
    // Primero limpiar el almacenamiento local
    localStorage.removeItem('currentUser');
    localStorage.removeItem('jwt');
    
    // Luego llamar al servicio de logout
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Aún así, redirigir al login ya que el almacenamiento local ya está limpio
        this.router.navigate(['/login']);
      }
    });
  }

  

  fetchRoles(): void {
    this.http.get<any[]>(`${this.apiUrl}/roles-usuarios`).subscribe(
      (roles) => {
        this.roles = roles;
      },
      (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar roles',
          text: 'No se pudieron cargar los roles. Inténtalo más tarde.',
        });
      }
    );
  }

  fetchEmployees(sucursalId: number): void {
    this.http.get<any[]>(`${this.apiUrl}/usuarios/sucursal/${sucursalId}`).subscribe(
      (employees) => {
        this.employees = employees;
        console.log('Empleados cargados:', this.employees);
      },
      (error) => {
        console.error('Error al obtener empleados:', error);
        Swal.fire('Error', 'No se pudieron cargar los empleados para esta sucursal.', 'error');
      }
    );
  }
  
  
  

  showAddModal(): void {
    // Inicializar el nuevo empleado con valores por defecto
    this.newEmployee = {
      nombreCompleto: '',
      username: '',
      email: '',
      password: '',
      rol: {},
      activo: true
    };
    
    const addEmployeeModal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
    addEmployeeModal.show();
  }

  showEditModal(employee: any): void {
    console.log('Empleado recibido para edición:', employee);  // Verifica si el objeto employee tiene los datos correctos
  
    this.selectedEmployee = { ...employee };  // Copia el objeto para edición
    this.selectedEmployee.newPassword = ''; // Agregar campo para contraseña nueva opcional
  
    console.log('Datos del empleado a editar:', this.selectedEmployee);  // Verifica si los datos fueron copiados correctamente
    
    const editEmployeeModal = new bootstrap.Modal(document.getElementById('editEmployeeModal'));
    editEmployeeModal.show();  // Abre el modal
  }

  showDeleteModal(employee: any): void {
    this.selectedEmployee = { ...employee }; // Copy the employee data to the selectedEmployee object
    const deleteEmployeeModal = new bootstrap.Modal(document.getElementById('deleteEmployeeModal'));
    deleteEmployeeModal.show();
  }

  // Add a new employee
  addEmployee(): void {
    // Validar campos requeridos
    if (!this.newEmployee.nombreCompleto || !this.newEmployee.username || 
        !this.newEmployee.email || !this.newEmployee.password || 
        !this.newEmployee.rol) {
      Swal.fire({
        icon: 'error',
        title: 'Campos incompletos',
        text: 'Por favor, complete todos los campos requeridos.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Obtener el ID de la sucursal
    const sucursalId = this.authService.getSucursalId();
    if (!sucursalId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo determinar la sucursal.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Crear una copia del objeto para enviar
    const employeeToSend = {
      nombreCompleto: this.newEmployee.nombreCompleto,
      username: this.newEmployee.username,
      email: this.newEmployee.email,
      password: this.newEmployee.password,
      rol: this.newEmployee.rol,
      activo: this.newEmployee.activo === undefined ? true : this.newEmployee.activo,
      sucursal: { id: sucursalId }
    };

    this.loading = true;
    this.http.post(`${this.apiUrl}/usuarios/register`, employeeToSend).subscribe(
      (response) => {
        this.loading = false;
        console.log('Employee added successfully', response);

        // Recargar empleados
        this.fetchEmployees(sucursalId);

        // Cerrar el modal y limpiar el formulario
        bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal')).hide();
        this.newEmployee = { rol: null, activo: true };

        Swal.fire({
          icon: 'success',
          title: 'Empleado agregado',
          text: 'El empleado ha sido añadido exitosamente!',
          confirmButtonText: 'OK'
        });
      },
      (error) => {
        this.loading = false;
        console.error('Error adding employee:', error);

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al agregar el empleado. Por favor, inténtalo de nuevo.',
          confirmButtonText: 'OK'
        });
      }
    );
  }
  

  // Edit an employee
// Edit an employee
editEmployee(): void {
  const updatedEmployee = { ...this.selectedEmployee };

  // Si se ha ingresado una nueva contraseña, inclúyela en la solicitud
  if (updatedEmployee.newPassword && updatedEmployee.newPassword.trim() !== '') {
    updatedEmployee.password = updatedEmployee.newPassword;
  } else {
    // Si no se ingresa una nueva contraseña, elimínala del objeto para no enviarla
    delete updatedEmployee.password;
  }

  this.http.put(`${this.apiUrl}/usuarios/${updatedEmployee.id}`, updatedEmployee).subscribe(
    (response) => {
      console.log('Empleado actualizado correctamente', response);

      // Obtener sucursalId y recargar empleados
      const sucursalId = this.authService.getSucursalId();
      if (sucursalId) {
        this.fetchEmployees(sucursalId);
      }

      // Muestra la confirmación de éxito
      Swal.fire({
        icon: 'success',
        title: 'Empleado Actualizado',
        text: 'El empleado ha sido actualizado correctamente',
        confirmButtonText: 'OK'
      }).then(() => {
        // Cierra el modal después de la confirmación
        bootstrap.Modal.getInstance(document.getElementById('editEmployeeModal')).hide();
      });
    },
    (error) => {
      console.error('Error al actualizar empleado:', error);

      // Muestra una alerta de error
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: 'Hubo un problema al actualizar el empleado. Inténtalo de nuevo.',
        confirmButtonText: 'OK'
      });
    }
  );
}


  

  // Delete an employee
  deleteEmployee(): void {
    this.http.delete(`${this.apiUrl}/usuarios/${this.selectedEmployee.id}`).subscribe(
      () => {
        console.log('Empleado eliminado correctamente');
        
        // Obtener el sucursalId desde AuthService
        const sucursalId = this.authService.getSucursalId();
        if (sucursalId) {
          this.fetchEmployees(sucursalId); // Pasar el sucursalId a fetchEmployees
        } else {
          console.error('Sucursal ID no encontrado. No se puede actualizar la lista de empleados.');
        }
        
        Swal.fire({
          icon: 'success',
          title: 'Empleado eliminado',
          text: 'El empleado ha sido eliminado correctamente',
          confirmButtonText: 'OK'
        }).then(() => {
          const openButton = document.getElementById('openDeleteModalButton'); // Elemento que abre el modal
          openButton?.focus(); // Devuelve el foco al botón que abre el modal o a otro elemento visible
        });
  
        // Cerrar el modal
        const modalElement = document.getElementById('deleteEmployeeModal');
        bootstrap.Modal.getInstance(modalElement)?.hide(); // Cierra el modal
  
        // Añadir el atributo 'inert' para hacer el modal inaccesible
        modalElement?.setAttribute('inert', ''); // Esto previene que el modal reciba foco una vez cerrado
      },
      (error) => {
        console.error('Error al eliminar empleado:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al eliminar',
          text: 'Hubo un problema al eliminar el empleado. Inténtalo de nuevo.',
          confirmButtonText: 'OK'
        });
      }
    );
  }
  
  toggleUserDropdown(event: Event) {
    event.preventDefault();
    this.showUserDropdown = !this.showUserDropdown;
  }
}

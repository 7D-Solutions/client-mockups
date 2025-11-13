/**
 * FireProof UI Kit - Mockup Core
 * Provides session-based data management and UI utilities for mockups
 */

class MockupStore {
  constructor(storeName) {
    this.storeName = storeName;
    this.data = this.load();
  }

  load() {
    const stored = sessionStorage.getItem(this.storeName);
    return stored ? JSON.parse(stored) : [];
  }

  save() {
    sessionStorage.setItem(this.storeName, JSON.stringify(this.data));
  }

  getAll() {
    return [...this.data];
  }

  getById(id) {
    return this.data.find(item => item.id === id);
  }

  generateId() {
    // Generate a unique ID using timestamp + random string
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  add(item) {
    const newItem = {
      ...item,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    this.data.push(newItem);
    this.save();
    return newItem;
  }

  update(id, updates) {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.save();
      return this.data[index];
    }
    return null;
  }

  delete(id) {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  clear() {
    this.data = [];
    sessionStorage.removeItem(this.storeName);
  }

  search(query, fields = []) {
    if (!query) return this.getAll();

    const lowerQuery = query.toLowerCase();
    return this.data.filter(item => {
      return fields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase() === lowerQuery;
      });
    });
  }

  filter(filterFn) {
    return this.data.filter(filterFn);
  }
}

// Modal Manager
class ModalManager {
  static show(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById('modal-backdrop');
    if (modal) {
      modal.classList.add('show');
      if (backdrop) backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  static hide(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById('modal-backdrop');
    if (modal) {
      modal.classList.remove('show');
      if (backdrop) backdrop.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  static confirm(message, onConfirm) {
    if (window.confirm(message)) {
      onConfirm();
    }
  }
}

// Toast Notifications
class Toast {
  static show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${this.getColor(type)};
      color: white;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  static getColor(type) {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[type] || colors.info;
  }

  static success(message) {
    this.show(message, 'success');
  }

  static error(message) {
    this.show(message, 'error');
  }

  static warning(message) {
    this.show(message, 'warning');
  }

  static info(message) {
    this.show(message, 'info');
  }
}

// Form Utilities
class FormUtils {
  static getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  }

  static setFormData(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(data).forEach(key => {
      const input = form.elements[key];
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = data[key];
        } else {
          input.value = data[key];
        }
      }
    });
  }

  static clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
  }

  static validate(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    return form.checkValidity();
  }
}

// Table Renderer
class TableRenderer {
  static render(tableId, data, columns) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length}" class="text-center text-muted">
            No data available
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(item => `
      <tr>
        ${columns.map(col => `
          <td>${col.render ? col.render(item) : item[col.field]}</td>
        `).join('')}
      </tr>
    `).join('');
  }

  static renderActions(item, actions) {
    return actions.map(action => `
      <button
        class="btn btn-${action.variant || 'secondary'} btn-sm"
        onclick="${action.onclick}('${item.id}')"
      >
        ${action.label}
      </button>
    `).join(' ');
  }
}

// Date Utilities
class DateUtils {
  static formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  static formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  static getToday() {
    return new Date().toISOString().split('T')[0];
  }
}

// Initialize animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export for use in mockups
window.MockupStore = MockupStore;
window.ModalManager = ModalManager;
window.Toast = Toast;
window.FormUtils = FormUtils;
window.TableRenderer = TableRenderer;
window.DateUtils = DateUtils;

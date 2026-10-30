export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

class ToastStore {
  items = $state<ToastItem[]>([]);
  private nextId = 1;

  show(message: string, type: ToastItem['type'] = 'info', durationMs = 3800) {
    const id = this.nextId++;
    this.items.push({ id, type, message });
    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error', 4800);
  }

  info(message: string) {
    this.show(message, 'info');
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toast = new ToastStore();

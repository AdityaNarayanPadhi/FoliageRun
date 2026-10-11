import { RouteGenerateResponse } from '../types/route';

interface StoredRoute {
  id: string;
  createdAt: Date;
  response: RouteGenerateResponse;
}

class RouteStore {
  private store: Map<string, StoredRoute> = new Map();
  private readonly maxItems: number = 200;

  public save(response: RouteGenerateResponse): string {
    const id = `foliage_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Maintain maximum capacity
    if (this.store.size >= this.maxItems) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(id, {
      id,
      createdAt: new Date(),
      response,
    });

    return id;
  }

  public get(id: string): StoredRoute | undefined {
    return this.store.get(id);
  }
}

export const routeStore = new RouteStore();

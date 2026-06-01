import axios, { AxiosError } from 'axios';
import type { User, Playground, PlaygroundDetail, PlaygroundCreate, AskRequest, AskResponse, IngestResponse } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string })?.detail;
    return detail || error.message;
  }
  return 'An unexpected error occurred';
}

// Auth
export const authService = {
  getLoginUrl: () => `${BASE_URL}/auth/login`,

  async getMe(): Promise<User> {
    try {
      const { data } = await api.get<User>('/me');
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

// Playgrounds
export const playgroundService = {
  async list(): Promise<Playground[]> {
    try {
      const { data } = await api.get<Playground[]>('/playground/list');
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async get(id: number): Promise<PlaygroundDetail> {
    try {
      const { data } = await api.get<PlaygroundDetail>(`/playground/${id}`);
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async create(payload: PlaygroundCreate): Promise<{ id: number; name: string; namespace: string }> {
    try {
      const { data } = await api.post('/playground/new', payload);
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/playground/${id}`);
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

// Ask / Query
export const queryService = {
  async ask(req: AskRequest): Promise<AskResponse> {
    try {
      const { data } = await api.post<AskResponse>('/ask', req);
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

// Ingest documents
export const ingestService = {
  async ingest(playgroundId: number, context: string, files: File[]): Promise<IngestResponse> {
    try {
      const form = new FormData();
      form.append('playground_id', String(playgroundId));
      form.append('context', context);
      files.forEach((f) => form.append('files', f));

      const { data } = await api.post<IngestResponse>('/ingest', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

export interface User {
  id: number;
  username: string;
  avatar_url: string;
}

export interface Playground {
  id: number;
  name: string;
  created_at: string;
}

export interface PlaygroundDetail {
  id: number;
  name: string;
  context: string;
  created_at: string;
}

export interface PlaygroundCreate {
  name: string;
  db_url: string;
  context?: string;
}

export interface AskRequest {
  question: string;
  playground_id: number;
}

export interface AskResponse {
  answer: string;
  playground: string;
}

export interface IngestResponse {
  ingested: number;
  namespace: string;
}

export interface ApiError {
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface Article {
  id: string;
  url: string;
  title: string;
  description: string;
  createdAt: Date;
  source?: string;
}

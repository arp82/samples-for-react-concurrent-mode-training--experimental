export interface ReviewerVM {
  name: string;
  id: number;
}

export interface CommentsVM {
  id: number;
  text: string;
  reviewerId: number;
}

export interface AsyncResource<T> {
  read: () => T;
}

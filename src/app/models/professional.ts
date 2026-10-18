export type Review = {
  author: string;
  daysAgo: number;
  stars: number;
  text: string;
};

export type ServiceCategory = 'Maquiagem' | 'Cabelo' | 'Facial';

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  description: string;
  image: string;
};

export type Professional = {
  id: string;
  name: string;
  image: string;
  address: string;
  tags: string[];
  rating: number;
  reviewsCount: string;
  views: string;
  about: string[];
  services: Service[];
  gallery: string[];
  position: { lat: number; lng: number };
  reviews: Review[];
};

export const formatDuration = (minutes: number) =>
  `${(minutes / 60).toLocaleString('pt-BR')} h`;

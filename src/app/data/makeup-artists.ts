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

export type MakeupArtist = {
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
  reviews: Review[];
};

const gallery = [1, 2, 3, 4, 5, 6, 7].map((n) => `images/makeup/${n}.jpg`);

const services: Service[] = [
  {
    id: 'maquiagem-social',
    name: 'Maquiagem social',
    category: 'Maquiagem',
    price: 150,
    durationMinutes: 90,
    description: 'Maquiagem completa para eventos, jantares e festas, com acabamento natural e duradouro.',
    image: 'images/makeup/1.jpg',
  },
  {
    id: 'maquiagem-noiva',
    name: 'Maquiagem de noiva',
    category: 'Maquiagem',
    price: 350,
    durationMinutes: 150,
    description: 'Make para o grande dia, com teste prévio e produtos de longa duração e alta fixação.',
    image: 'images/makeup/3.jpg',
  },
  {
    id: 'maquiagem-artistica',
    name: 'Maquiagem artística',
    category: 'Maquiagem',
    price: 200,
    durationMinutes: 120,
    description: 'Looks criativos e coloridos para ensaios, carnaval, shows e eventos temáticos.',
    image: 'images/makeup/4.jpg',
  },
  {
    id: 'penteado-social',
    name: 'Penteado social',
    category: 'Cabelo',
    price: 120,
    durationMinutes: 60,
    description: 'Penteados presos ou soltos, como coques, tranças e ondas, para qualquer ocasião.',
    image: 'images/makeup/2.jpg',
  },
  {
    id: 'escova-modelada',
    name: 'Escova modelada',
    category: 'Cabelo',
    price: 80,
    durationMinutes: 60,
    description: 'Escova com acabamento liso ou com ondas, ideal para complementar a maquiagem.',
    image: 'images/makeup/6.jpg',
  },
  {
    id: 'limpeza-de-pele',
    name: 'Limpeza de pele express',
    category: 'Facial',
    price: 90,
    durationMinutes: 45,
    description: 'Preparação da pele antes da maquiagem, com limpeza, hidratação e revitalização.',
    image: 'images/makeup/5.jpg',
  },
];

const reviews: Review[] = [
  {
    author: 'Jennie Whang',
    daysAgo: 2,
    stars: 4,
    text: 'O local era limpo, atendimento ótimo e a equipe é muito simpática. Com certeza vou recomendar.',
  },
  {
    author: 'Paula Ribeiro',
    daysAgo: 6,
    stars: 5,
    text: 'Maquiagem perfeita para o meu casamento, durou a noite toda. Super indico!',
  },
  {
    author: 'Aline Souza',
    daysAgo: 14,
    stars: 5,
    text: 'Profissional atenciosa e pontual. Amei o resultado.',
  },
];

const artist = (
  id: string,
  name: string,
  image: number,
  address: string,
  tags: string[],
  rating: number,
  reviewsCount: string,
  views: string,
): MakeupArtist => ({
  id,
  name,
  image: `images/makeup/${image}.jpg`,
  address,
  tags,
  rating,
  reviewsCount,
  views,
  about: [
    `${name} é uma maquiadora profissional que atende no Rio de Janeiro, com foco em realçar a beleza natural de cada cliente. Acreditamos que, se é importante para você, é importante para nós.`,
    `Sempre acompanhando as últimas tendências do mercado, ${name} reconhece a necessidade de constante aperfeiçoamento. Nossa equipe passa por treinamentos regulares com maquiadores e cabeleireiros renomados, para entregar um resultado impecável em cada atendimento.`,
  ],
  services,
  gallery,
  reviews,
});

export const MAKEUP_ARTISTS: MakeupArtist[] = [
  artist('fernanda-lima', 'Fernanda Lima', 1, 'Rua Constante Ramos, 35 - Copacabana, Rio de Janeiro', ['Cabelo', 'Facial'], 4.7, '2.7k', '10 mil'),
  artist('camila-torres', 'Camila Torres', 2, 'Rua Visconde de Pirajá, 550 - Ipanema, Rio de Janeiro', ['Cabelo', 'Unhas', 'Facial'], 4.8, '3.1k', '12 mil'),
  artist('rafaela-duarte', 'Rafaela Duarte', 3, 'Rua Farme de Amoedo, 20 - Ipanema, Rio de Janeiro', ['Unhas', 'Spa'], 4.5, '1.2k', '6 mil'),
  artist('mariana-costa', 'Mariana Costa', 4, 'Rua Barão da Torre, 411 - Ipanema, Rio de Janeiro', ['Maquiagem', 'Cabelo'], 4.9, '4.2k', '18 mil'),
  artist('juliana-prado', 'Juliana Prado', 5, 'Rua Dias Ferreira, 233 - Leblon, Rio de Janeiro', ['Cabelo', 'Unhas'], 4.6, '1.9k', '8 mil'),
  artist('beatriz-almeida', 'Beatriz Almeida', 6, 'Av. Atlântica, 1702 - Copacabana, Rio de Janeiro', ['Cabelo', 'Facial'], 4.7, '2.7k', '9 mil'),
  artist('larissa-menezes', 'Larissa Menezes', 7, 'Rua Nascimento Silva, 76 - Ipanema, Rio de Janeiro', ['Maquiagem', 'Facial'], 4.6, '1.5k', '7 mil'),
];

export const formatDuration = (minutes: number) =>
  `${(minutes / 60).toLocaleString('pt-BR')} h`;

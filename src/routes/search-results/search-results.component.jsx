import { useState } from 'react';
import './search-results.styles';
import {
  SearchResultsFilter,
  SearchResultsWrapper,
  ProfessionalsContainer,
} from './search-results.styles';
import { Card } from '../../components/card/card.component';
import { ProfessionalCard } from '../../components/professional-card/professional-card.component';

export const SearchResults = () => {
  const [filters] = useState([
    { icon: 'home', name: 'Maquiagem leve' },
    { icon: 'cloud', name: 'Cabelo' },
    { icon: 'home', name: 'Domiciliar' },
    { icon: 'cloud', name: 'No Salao' },
    { icon: 'home', name: 'Ate 10km' },
  ]);

  const [professionals] = useState([
    {
      name: 'Isadora Lerner Alves de Lacerda',
      stars: 1,
      speciality: 'Perdi o leilão de novo poxa vida :(',
      image:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Alexandra_Daddario_2016.jpg/960px-Alexandra_Daddario_2016.jpg',
      services: [{ icon: 'home', name: 'Domiciliar' }],
    },
    {
      name: 'David Lerner',
      stars: 5,
      speciality: 'Inesquecivel',
      image:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Brad_Pitt-69858.jpg/960px-Brad_Pitt-69858.jpg',
      services: [
        { icon: 'home', name: 'Exemplo' },
        { icon: 'cleaning', name: 'Layout' },
        { icon: 'home', name: 'Domiciliar' },
        { icon: 'cloud', name: 'No Salao' },
      ],
    },
    {
      name: 'Rozane Sorraya Alves de Lacerda',
      stars: 4,
      speciality: 'Diarista gratuita',
      image:
        'https://br.web.img3.acsta.net/pictures/19/12/23/23/11/2382049.jpg',
      services: [
        { icon: 'home', name: 'Exemplo' },
        { icon: 'cleaning', name: 'Layout' },
        { icon: 'home', name: 'Domiciliar' },
        { icon: 'cloud', name: 'No Salao' },
      ],
    },
    {
      name: 'Miguel Lerner',
      stars: 0,
      speciality: 'Distribuidor de sentimentos',
      image:
        'https://br.web.img2.acsta.net/pictures/18/08/03/22/20/1549706.jpg',
      services: [],
    },
    {
      name: 'Jeremias Alves de Lacerda',
      stars: 0,
      speciality: 'Será que sou um beagle mesmo?',
      image:
        'https://i.pinimg.com/474x/d9/c8/95/d9c89588831da55765e31d5b9d0d2713.jpg',
      services: [],
    },
  ]);

  return (
    <SearchResultsWrapper>
      <SearchResultsFilter>
        {filters?.map(({ name, icon }, idx) => {
          return <Card key={idx} name={name} icon={icon} />;
        })}
      </SearchResultsFilter>
      <ProfessionalsContainer>
        {professionals.map(
          ({ name, stars, speciality, image, services }, idx) => {
            return (
              <ProfessionalCard
                key={idx}
                name={name}
                stars={stars}
                image={image}
                speciality={speciality}
                services={services}
              ></ProfessionalCard>
            );
          },
        )}
      </ProfessionalsContainer>
    </SearchResultsWrapper>
  );
};

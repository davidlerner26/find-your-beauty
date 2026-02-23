import { useEffect, useState } from 'react';
import './search-results.styles';
import {
  SearchResultsFilter,
  SearchResultsWrapper,
  ProfessionalsContainer,
} from './search-results.styles';
import { Card } from '../../components/card/card.component';
import { ProfessionalCard } from '../../components/professional-card/professional-card.component';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfessionalsStartAsync } from '../../store/professionals/professionals.action';
import { selectProfessionals } from '../../store/professionals/professionals.selector';

export const SearchResults = () => {
  const [filters] = useState([
    { icon: 'home', name: 'Maquiagem leve' },
    { icon: 'cloud', name: 'Cabelo' },
    { icon: 'home', name: 'Domiciliar' },
    { icon: 'cloud', name: 'No Salao' },
    { icon: 'home', name: 'Ate 10km' },
  ]);

  const dispatch = useDispatch();
  const professionals = useSelector(selectProfessionals);

  useEffect(() => {
    dispatch(fetchProfessionalsStartAsync());
  }, [dispatch]);

  return (
    <SearchResultsWrapper>
      <SearchResultsFilter>
        {filters?.map(({ name, icon }, idx) => {
          return <Card key={idx} name={name} icon={icon} />;
        })}
      </SearchResultsFilter>
      <ProfessionalsContainer>
        {professionals?.map(
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

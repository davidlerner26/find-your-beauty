import { useEffect, useState } from 'react';
import {
  ProfessionalsFilter,
  ProfessionalsWrapper,
  ProfessionalsContainer,
} from './professionals.styles';
import { Card } from '../../components/card/card.component';
import { ProfessionalCard } from '../../components/professional-card/professional-card.component';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfessionalsStartAsync } from '../../store/professionals/professionals.reducer';
import {
  selectIsLoading,
  selectProfessionals,
} from '../../store/professionals/professionals.selector';
import { Spinner } from '../../components/spinner/spinner.component';

const Professionals = () => {
  const [filters] = useState([
    { icon: 'home', name: 'Maquiagem leve' },
    { icon: 'cloud', name: 'Cabelo' },
    { icon: 'home', name: 'Domiciliar' },
    { icon: 'cloud', name: 'No Salao' },
    { icon: 'home', name: 'Ate 10km' },
  ]);

  const dispatch = useDispatch();
  const professionals = useSelector(selectProfessionals);
  const isLoading = useSelector(selectIsLoading);

  useEffect(() => {
    dispatch(fetchProfessionalsStartAsync());
  }, [dispatch]);

  return (
    <>
      {isLoading ? (
        <Spinner />
      ) : (
        <ProfessionalsWrapper>
          <ProfessionalsFilter>
            {filters?.map(({ name, icon }, idx) => {
              return <Card key={idx} name={name} icon={icon} />;
            })}
          </ProfessionalsFilter>
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
        </ProfessionalsWrapper>
      )}
    </>
  );
};

export default Professionals;

import { Icon } from '../icon/icon.component';
import './professional-card.styles';
import {
  ProfessionalCardContent,
  ProfessionalCardImage,
  ProfessionalCardWrapper,
  ProfessionalService,
  ProfessionalServicesWraper,
  Stars,
} from './professional-card.styles';

export const ProfessionalCard = ({
  name,
  stars,
  speciality,
  image,
  services,
}) => {
  return (
    <ProfessionalCardWrapper>
      <ProfessionalCardImage>
        <img src={image} />
      </ProfessionalCardImage>
      <ProfessionalCardContent>
        <h3>{name}</h3>
        <Stars>
          {Array.from({ length: 5 }, (_, i) => (
            <Icon
              key={i}
              color={i < stars ? 'rgb(255, 210, 0)' : 'rgba(255, 210, 0, 0.3)'}
              icon="star"
            />
          ))}
          <p>{stars}</p>
        </Stars>
        <p>{speciality}</p>
        <ProfessionalServicesWraper>
          {services?.map(({ icon, name }, idx) => {
            return (
              <ProfessionalService key={idx}>
                <Icon icon={icon} />
                <p>{name}</p>
              </ProfessionalService>
            );
          })}
        </ProfessionalServicesWraper>
      </ProfessionalCardContent>
    </ProfessionalCardWrapper>
  );
};

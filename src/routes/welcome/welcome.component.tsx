import { SearchBox } from '../../components/search-box/search-box.component';
import Card from '../../components/card/card.component';
import Button from '@mui/material/Button';
import {
  WelcomeWrapper,
  WelcomeSubTitle,
  WelcomeCards,
  WelcomeContent,
} from './welcome.styles';

const Welcome = () => {
  const cards = [
    {
      name: 'Atendimento domiciliar',
      icon: 'home',
    },
    {
      name: 'Maquiagem leve',
      icon: 'cloud',
    },
    {
      name: 'Maquiagem Marcada',
      icon: 'apple',
    },
  ];

  const findProfessionalsNearMe = () => {};

  return (
    <WelcomeWrapper>
      <WelcomeContent>
        <h1>Find makeup artists and hairstylists near you.</h1>
        <WelcomeSubTitle>
          Discover beauty professionals in your area.
        </WelcomeSubTitle>
        <SearchBox />
        <WelcomeCards>
          {cards.map(({ name, icon }, idx) => {
            return <Card key={idx} name={name} icon={icon} />;
          })}
        </WelcomeCards>
        <Button
          color="secondary"
          variant="contained"
          size="large"
          onClick={findProfessionalsNearMe}
        >
          Find professionals near me
        </Button>
      </WelcomeContent>
    </WelcomeWrapper>
  );
};

export default Welcome;

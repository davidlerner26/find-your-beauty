import { SearchBox } from '../../components/search-box/search-box.component.jsx';
import { Card } from '../../components/card/card.component.jsx';
import Button from '@mui/material/Button';
import {
  HomeWrapper,
  HomeSubTitle,
  HomeCards,
  HomeContent,
} from './home.styles.jsx';

export default function Home() {
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
    <HomeWrapper>
      <HomeContent>
        <h1>Find makeup artists and hairstylists near you.</h1>
        <HomeSubTitle>Discover beauty professionals in your area.</HomeSubTitle>
        <SearchBox />
        <HomeCards className="home-content-cards">
          {cards.map(({ name, icon }, idx) => {
            return <Card key={idx} name={name} icon={icon} />;
          })}
        </HomeCards>
        <Button
          color="secondary"
          variant="contained"
          size="large"
          onClick={findProfessionalsNearMe}
        >
          Find professionals near me
        </Button>
      </HomeContent>
    </HomeWrapper>
  );
}

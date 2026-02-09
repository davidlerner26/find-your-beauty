import './home.styles.scss';
import { SearchBox } from '../../components/search-box/search-box.component';
import { Card } from '../../components/card/card.component';
import Button from '@mui/material/Button';

export const Home = () => {
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
    <>
      <div className="home">
        <div className="home-content">
          <h1>Find makeup artists and hairstylists near you.</h1>
          <h3>Discover beauty professionals in your area.</h3>
          <SearchBox />
          <div className="home-content-cards">
            {cards.map(({ name, icon }, idx) => {
              return <Card key={idx} name={name} icon={icon} />;
            })}
          </div>
          <Button
            color="secondary"
            variant="contained"
            size="large"
            onClick={findProfessionalsNearMe}
          >
            Find professionals near me
          </Button>
        </div>
      </div>
    </>
  );
};

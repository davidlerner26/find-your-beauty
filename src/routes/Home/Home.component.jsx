import { useState } from 'react';
import './home.styles.scss';
import { SearchBox } from '../../components/search-box/search-box.component';
import { Card } from '../../components/card/card.component';

export const Home = () => {
  const data = [
    {
      name: 'La Belle',
      location: 'Ipanema | Rio de Janeiro',
      image:
        'https://lh3.googleusercontent.com/gps-cs-s/AHVAweojHR-n67cjtLqUQddGhf7x0CAsH_nVWPvQhMXyAmq0sHhfFrSnRBL_eVzdyQta97AMusSh938KH4cx_H50E5tXrf54WsOdUx5O8PsMXiOfJ_jAhmM6MDk0gJtuhbh8eK-faPPr=w408-h544-k-no',
    },
    {
      name: 'Giovanni Parrucchiere',
      location: 'Botafogo | Rio de Janeiro',
      image:
        'https://lh3.googleusercontent.com/p/AF1QipMjZpQ4_Xda6yHaxYXcHDyBPuSBper3ZnyNmOye=w426-h240-k-no',
    },
    {
      name: 'Regis Melo Hair Stylis Barra',
      location: 'Barra da Tijuca | Rio de Janeiro',
      image:
        'https://lh3.googleusercontent.com/p/AF1QipPYQq4qgOnW7icCofPpr6BwdWqpT56pRAyYo2Uz=w408-h544-k-no',
    },
    {
      name: 'Concept Prime Hair',
      location: 'Botafogo | Rio de Janeiro',
      image:
        'https://lh3.googleusercontent.com/p/AF1QipOZQyyymJXoPTbFF9UIDd23TcfMk_Xax3mSUymN=w408-h725-k-no',
    },
  ];

  const [filteredData, setFilteredData] = useState(data);

  const onInputChange = (e) => {
    const text = e?.target?.value;
    if (text?.length >= 3) {
      const newData = filteredData.filter((data) =>
        data?.location?.toLowerCase().includes(text?.toLowerCase()),
      );
      setFilteredData(newData);
    } else {
      setFilteredData(data);
    }
  };

  return (
    <p>home</p>
    // <div className='find-your-beauty'>
    //   <SearchBox onInputChange={onInputChange} />
    //   <div className='find-your-beauty__container'>
    //     {
    //     filteredData.map(({name, location, image}, idx) =>{
    //     return <Card key={idx} image={image} name={name} location={location}/>
    //     })
    //   }
    //   </div>
    // </div>
  );
};

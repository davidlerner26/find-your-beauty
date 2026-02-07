import './card.styles.scss';
import { FaHome } from 'react-icons/fa';
import { WiDayCloudy } from 'react-icons/wi';
import { DiApple } from 'react-icons/di';

export const Card = ({ name, icon }) => {
  const renderIcon = () => {
    switch (icon) {
      case 'home':
        return <FaHome />;
      case 'cloud':
        return <WiDayCloudy />;
      case 'apple':
        return <DiApple />;
      default:
        throw new Error('Icon does not exist.');
    }
  };

  return (
    <div className="card">
      {renderIcon()}
      <p>{name}</p>
    </div>
  );
};

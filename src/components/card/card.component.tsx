import { FC } from 'react';
import { Icon } from '../icon/icon.component';
import './card.styles.tsx';
import { CardButton } from './card.styles.tsx';

type CardProps = {
  name: string;
  icon: string;
};

const Card: FC<CardProps> = ({ name, icon }) => {
  const renderIcon = () => {
    return <Icon icon={icon} />;
  };

  return (
    <CardButton
      color="secondary"
      variant="contained"
      size="large"
      startIcon={renderIcon()}
    >
      {name}
    </CardButton>
  );
};

export default Card;

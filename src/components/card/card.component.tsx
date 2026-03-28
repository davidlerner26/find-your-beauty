import { Icon } from '../icon/icon.component';
import './card.styles.tsx';
import Button from '@mui/material/Button';
import { CardButton } from './card.styles.tsx';

export const Card = ({ name, icon }) => {
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

import { Icon } from '../icon/icon.component';
import './card.styles.scss';
import Button from '@mui/material/Button';

export const Card = ({ name, icon }) => {
  const renderIcon = () => {
    return <Icon icon={icon} />;
  };

  return (
    <Button
      className="card"
      color="secondary"
      variant="contained"
      size="large"
      startIcon={renderIcon()}
    >
      {name}
    </Button>
  );
};

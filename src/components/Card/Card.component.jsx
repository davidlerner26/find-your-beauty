import './card.styles.scss';
import BrushIcon from '@mui/icons-material/Brush';
import HomeIcon from '@mui/icons-material/Home';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import Button from '@mui/material/Button';

export const Card = ({ name, icon }) => {
  const renderIcon = () => {
    switch (icon) {
      case 'home':
        return <HomeIcon />;
      case 'cloud':
        return <BrushIcon />;
      case 'apple':
        return <WatchLaterIcon />;
      default:
        throw new Error('Icon does not exist.');
    }
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

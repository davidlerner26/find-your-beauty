import BrushIcon from '@mui/icons-material/Brush';
import HomeIcon from '@mui/icons-material/Home';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import StarIcon from '@mui/icons-material/Star';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { FC } from 'react';

type IconProps = {
  icon: string;
  color?: string;
};

export const Icon: FC<IconProps> = ({ icon, color }: IconProps) => {
  const iconProps = color ? { sx: { color } } : {};

  const renderIcon = () => {
    switch (icon) {
      case 'home':
        return <HomeIcon {...iconProps} />;
      case 'cloud':
        return <BrushIcon {...iconProps} />;
      case 'apple':
        return <WatchLaterIcon {...iconProps} />;
      case 'star':
        return <StarIcon {...iconProps} />;
      case 'cleaning':
        return <CleaningServicesIcon {...iconProps} />;
      default:
        throw new Error('Icon does not exist.');
    }
  };

  return renderIcon();
};

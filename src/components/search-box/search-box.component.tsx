import SearchIcon from '@mui/icons-material/Search';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import { FC } from 'react';

export const SearchBox: FC = () => {
  const onButtonSearchClick = () => {};

  return (
    <>
      <FormControl
        fullWidth
        sx={{
          // text typed
          '& .MuiInputBase-input': { color: '#fff' },

          // label
          '& .MuiInputLabel-root': { color: '#ddd' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },

          // outline border
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,.5)',
          },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#fff',
          },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
            {
              borderColor: '#fff',
            },

          // when typing / focused / shrunk label position (more space)
          '& .MuiInputLabel-root.MuiInputLabel-shrink': {
            transform: 'translate(14px, -10px) scale(0.85)',
          },
        }}
      >
        <InputLabel htmlFor="outlined-adornment-amount">
          Type your location
        </InputLabel>
        <OutlinedInput
          id="outlined-adornment-amount"
          endAdornment={
            <InputAdornment position="end">
              <SearchIcon
                sx={{ color: '#fff', cursor: 'pointer' }}
                onClick={onButtonSearchClick}
              />
            </InputAdornment>
          }
          label="Amount"
        />
      </FormControl>
    </>
  );
};

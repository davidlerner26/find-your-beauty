import './search-box.styles.scss';
import SearchIcon from '@mui/icons-material/Search';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

export const SearchBox = () => {
  const onButtonSearchClick = () => {};

  return (
    <>
      <FormControl fullWidth sx={{ m: 1 }}>
        <InputLabel htmlFor="outlined-adornment-amount">
          Type your location
        </InputLabel>
        <OutlinedInput
          id="outlined-adornment-amount"
          endAdornment={
            <InputAdornment position="end">
              <SearchIcon onClick={onButtonSearchClick} />
            </InputAdornment>
          }
          label="Amount"
        />
      </FormControl>
    </>
  );
};

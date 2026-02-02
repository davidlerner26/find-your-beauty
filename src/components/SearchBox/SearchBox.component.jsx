import './SearchBox.styles.scss';

export const SearchBox = ({onInputChange}) =>{
    return <input placeholder='Search beauty saloons by location' onChange={onInputChange}/>
}
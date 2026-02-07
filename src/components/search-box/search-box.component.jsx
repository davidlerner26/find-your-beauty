import './search-box.styles.scss';

export const SearchBox = () => {
  const onInputChange = () => {};
  const onButtonSearchClick = () => {};

  return (
    <div className="input-field">
      <input placeholder="Type your location" onChange={onInputChange} />
      <button onClick={onButtonSearchClick}>Search</button>
    </div>
  );
};

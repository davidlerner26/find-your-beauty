import './card.styles.scss';

export const Card = ({name, location,image}) => {
    return (
    <div className="card">
        <img src={image}/>
        <h3>{name}</h3>
        <p>{location}</p>
    </div>
    )
}
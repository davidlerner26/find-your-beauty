import { Alert } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import './admin.styles.scss';
import { useState } from 'react';
import { useReducer } from 'react';
import { listReducer } from '../../reducers/list.reducer';

export const Admin = () => {
  const [alerts, setAlerts] = useState([]);
  const [input, setInput] = useState('');
  const initialList = [{ name: 'Isadora' }, { name: 'David' }];
  const [list, dispatch] = useReducer(listReducer, initialList);

  const approve = (item) => {
    removeItem(item, 'approved');
  };

  const disapprove = (item) => {
    removeItem(item, 'deleted');
  };

  const removeItem = (item, action) => {
    setAlerts((prev) => [...prev, `${item.name} was ${action} successfuly.`]);
    dispatch({
      type: 'remove',
      item,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input !== '') {
      dispatch({
        type: 'add',
        input,
      });
    }
  };

  return (
    <section className="admin">
      {alerts?.length > 0 &&
        alerts.map((alert, idx) => {
          return (
            <Alert
              key={idx}
              icon={<CheckIcon fontSize="inherit" />}
              severity="success"
            >
              {alert}
            </Alert>
          );
        })}

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Add"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>

      <ul>
        {list.map((item, idx) => {
          return (
            <li key={idx}>
              <p>{item.name}</p>
              <button onClick={() => approve(item)}>Approve</button>
              <button onClick={() => disapprove(item)}>Delete</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

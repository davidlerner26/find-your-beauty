import { Alert } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import './admin.styles.scss';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addSchedule,
  removeSchedule,
} from '../../store/schedules/schedules.reducer';
import { addAlert } from '../../store/alerts/alerts.reducer';
import { selectSchedules } from '../../store/schedules/schedules.selector';
import { selectAlerts } from '../../store/alerts/alerts.selector';

export const Admin = () => {
  const schedules = useSelector(selectSchedules);
  const alerts = useSelector(selectAlerts);
  const dispatch = useDispatch();

  const [input, setInput] = useState('');

  const approve = (item) => {
    dispatch(removeSchedule(item));
    dispatch(addAlert(`${item.name} was approved successfuly.`));
  };

  const disapprove = (item) => {
    dispatch(removeSchedule(item));
    dispatch(addAlert(`${item.name} was disapproved successfuly.`));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input !== '') {
      dispatch(addSchedule(input));
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
        {schedules?.map((item, idx) => {
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

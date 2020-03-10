import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import BottomNavigation from '@material-ui/core/BottomNavigation';
import BottomNavigationAction from '@material-ui/core/BottomNavigationAction';
import RestoreIcon from '@material-ui/icons/Restore';
import FavoriteIcon from '@material-ui/icons/Favorite';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import LinkM from '@material-ui/core/Link';
import { Redirect } from 'react-router-dom';
import { Link, NavLink} from 'react-router-dom';
import { colors } from '../../theme';

const useStyles = makeStyles({
  root: {
    width: 500,
  },
  active: {
      color: colors.fiblue,
  },
});

export default function SimpleBottomNavigation(props) {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  return (
    <BottomNavigation
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue);
        switch(newValue) {
            case 'Prime':
                return <Redirect to='/prime' />;
            case 'Inventory':
                return <Redirect to={`/inventory/${props.account}`} />;
            case 'All':
                return <Redirect to={`/inventory/${props.account}`} />;
        }
      }}
      showLabels
      className={classes.root}
    >
      <NavLink activeClassName={classes.active} exact to='/prime'><BottomNavigationAction label="Prime" icon={<RestoreIcon />} /></NavLink>
      <BottomNavigationAction label="Inventory" icon={<FavoriteIcon />} />
      <BottomNavigationAction label="All" icon={<LocationOnIcon />} />
    </BottomNavigation>
  );
}
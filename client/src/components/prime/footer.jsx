import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import { colors } from '../../theme';
import GitHubIcon from '@material-ui/icons/GitHub';
import TwitterIcon from '@material-ui/icons/Twitter';



function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="/prime" underline='none'>
        Decentralized Financial Crafting Protocol
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const useStyles = makeStyles(theme => ({
  footer: {
    backgroundColor: theme.palette.background.paper,
    // marginTop: theme.spacing(8),
    padding: theme.spacing(6, 0),
    display: 'flex',
    width: '100%',
    backgroundolor: colors.primary,
  },
}));

export default function Footer(props) {
  const classes = useStyles();
  const { description, title } = props;

  return (
    <footer className={classes.footer}>
      <Container maxWidth="lg">
        <Typography variant="h1" align="center" gutterBottom style={{ }}>
          {title}
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" component="p">
          {description}
        </Typography>
        <Copyright />
      </Container>
    </footer>
  );
}

Footer.propTypes = {
  description: PropTypes.string,
  title: PropTypes.string,
};
import React, { Component, PureComponent } from 'react';


import { makeStyles } from '@material-ui/core/styles';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import { Typography } from '@material-ui/core';

const styles = theme => ({
    chainBody: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        margin: '16px',
    },
    chainHeader: {
        color: colors.primary,
    },

});

function MintForm(props) {
  const classes = props;
  const [value, setValue] = React.useState();

  const handleChange = event => {
    setValue(event.target.value);
  };

  let assets = props.assets['assetIds'].map(itemId => props.assets[itemId]);
  let expirations = props.expirations['expirationIds'].map(itemId => props.expirations[itemId]);

  return (
    <div className={classes.chainBody}>
      <FormControl component="fieldset" className={classes.chainBody}>
        <FormLabel variant={'h1'} className={classes.chainHeader} component="legend">Collateral</FormLabel>
        <RadioGroup aria-label="asset" name="asset1" value={value} onChange={handleChange}>
            {assets.map((asset) => {
                return(
                    <FormControlLabel value={asset.payload} control={<Radio />} label={asset.content} />
                );
            })}
        </RadioGroup>
      </FormControl>
      <FormControl component="fieldset" className={classes.chainBody}>
        <FormLabel variant={'h1'} component="legend">Payment</FormLabel>
        <RadioGroup aria-label="asset" name="asset2" value={value} onChange={handleChange}>
        {assets.map((asset) => {
                return(
                    <FormControlLabel value={asset.payload} control={<Radio />} label={asset.content} />
                );
            })}
        </RadioGroup>
      </FormControl>
      <FormControl component="fieldset" className={classes.chainBody}>
        <FormLabel variant={'h1'} component="legend">Expiration</FormLabel>
        <RadioGroup aria-label="expiration" name="expiration" value={value} onChange={handleChange}>
        {expirations.map((expiration) => {
                return(
                    <FormControlLabel value={expiration.payload} control={<Radio />} label={expiration.content} />
                );
            })}
        </RadioGroup>
      </FormControl>
    </div>
  );
};

export default withStyles(styles)(MintForm);

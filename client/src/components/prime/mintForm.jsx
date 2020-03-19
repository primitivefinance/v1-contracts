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
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'row',
        margin: '16px',
    },
    chainHeader: {
        color: colors.primary,
    },

});

class MintForm extends Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }
  
    handleChange = event => {
      let name = event.target.name;
      let value = event.target.value;
      switch(name) {
          case 'collateral':
              this.props.handleSelect(value , name);
              break;
          case 'payment':
              this.props.handleSelect(value, name);
              break;
          case 'expiration':
              this.props.handleSelect(value, name);
              break;
      };
      event.preventDefault();
    };
  
    
    render () {
    const classes = this.props.classes;
    let assets = this.props.assets['assetIds'].map(itemId => this.props.assets[itemId]);
    let expirations = this.props.expirations['expirationIds'].map(itemId => this.props.expirations[itemId]);
    return (
      <div className={classes.chainBody} key="optionForm">
        <FormControl component="fieldset" className={classes.chainBody} classes={{
          margin: '16px',
        }}>
          <FormLabel variant={'h1'} className={classes.chainHeader} component="legend">Collateral</FormLabel>
          <RadioGroup aria-label="asset" name="collateral" value={this.props.collateral} onChange={this.handleChange}>
              {assets.map((asset) => {
                  return(
                      <FormControlLabel value={asset.payload} control={<Radio />} label={asset.content}/>
                  );
              })}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" className={classes.chainBody}>
          <FormLabel variant={'h1'} component="legend">Payment</FormLabel>
          <RadioGroup aria-label="asset" name="payment" value={this.props.payment} onChange={this.handleChange}>
          {assets.map((asset) => {
                  return(
                      <FormControlLabel value={asset.payload} control={<Radio />} label={asset.content} />
                  );
              })}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" className={classes.chainBody}>
          <FormLabel variant={'h1'} component="legend">Expiration</FormLabel>
          <RadioGroup aria-label="expiration" name="expiration" value={this.props.expiration} onChange={this.handleChange}>
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
};


/* function MintForm(props) {
  const classes = props.classes;
  const [value, setValue] = React.useState();

  const handleChange = event => {
    let name = event.target.name;
    let value = event.target.value;
    switch(name) {
        case 'collateral':
            setValue(value);
            props.handleSelect(value, name);
            break;
        case 'payment':
            setValue(value);
            props.handleSelect(value, name);
            break;
        case 'expiration':
            setValue(value);
            props.handleSelect(value, name);
            break;
    };
    event.preventDefault();
  };

  let assets = props.assets['assetIds'].map(itemId => props.assets[itemId]);
  let expirations = props.expirations['expirationIds'].map(itemId => props.expirations[itemId]);

  return (
    <div className={classes.chainBody} key="optionForm">
      <FormControl component="fieldset" className={classes.chainBody} classes={{
        margin: '16px',
      }}>
        <FormLabel variant={'h1'} className={classes.chainHeader} component="legend">Collateral</FormLabel>
        <RadioGroup aria-label="asset" name="collateral" value={value} onChange={handleChange}>
            {assets.map((asset) => {
                return(
                    <FormControlLabel value={asset.payload} control={<Radio />} label={asset.content}/>
                );
            })}
        </RadioGroup>
      </FormControl>
      <FormControl component="fieldset" className={classes.chainBody}>
        <FormLabel variant={'h1'} component="legend">Payment</FormLabel>
        <RadioGroup aria-label="asset" name="payment" value={value} onChange={handleChange}>
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
}; */

export default withStyles(styles)(MintForm);

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepButton from '@material-ui/core/StepButton';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { colors } from '../../theme/theme';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  label: {
    '&$active': {
      color: colors.primary,
      fontWeight: 500,
    },
  },
  active: {
    color: colors.primary,
  },
  button: {
    marginRight: theme.spacing(1),
  },
  completed: {
    display: 'inline-block',
    color: colors.primary,
    '& $line': {
      borderColor: '#784af4',
    },
  },
  instructions: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  MuiStepLabel: {
    active: {
      color: colors.primary,
    },
  },
  '.MuiStepLabel-label.MuiStepLabel-completed' : {
    color: colors.primary,
  },

}));

function getSteps() {
  return ['Select Collateral', 'Select Payment', 'Select Expiration',];
}

function getBottomSteps() {
  return ['Select Evolution', 'Select Double Collateral', 'Select Double Payment', 'Select NFT', 'Select Interest Receiver'];
}

function getStepContent(step) {
  switch (step) {
    case 0:
      return 'Collateral';
    case 1:
      return 'Payment Asset';
    case 2:
      return 'Option expires?';
    case 3: 
      return 'Who gets the payment?';
    default:
      return 'Unknown step';
  }
}

function getBottomStepContent(step) {
  switch (step) {
    case 4:
      return 'Collateral';
    case 5:
      return 'Payment Asset';
    case 6:
      return 'Option expires?';
    case 7: 
      return 'Who gets the payment?';
    case 8: 
      return 'Who gets the payment?';
    default:
      return 'Unknown step';
  }
}

export default function HorizontalNonLinearStepper(props) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const [completed, setCompleted] = React.useState({});
  let steps;
  if(props.bottom) {
    steps = getBottomSteps();
  } else {
    steps = getSteps();
  }
  
  

  const totalSteps = () => {
    return steps.length;
  };

  const completedSteps = () => {
    return Object.keys(completed).length;
  };

  const isLastStep = () => {
    return activeStep === totalSteps() - 1;
  };

  const allStepsCompleted = () => {
    return completedSteps() === totalSteps();
  };

  const handleNext = () => {
    const newActiveStep =
      isLastStep() && !allStepsCompleted()
        ? // It's the last step, but not all steps have been completed,
          // find the first step that has been completed
          steps.findIndex((step, i) => !(i in completed))
        : activeStep + 1;
    setActiveStep(newActiveStep);
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleStep = step => () => {
    setActiveStep(step);
  };

  const handleComplete = () => {
    const newCompleted = completed;
    newCompleted[activeStep] = true;
    setCompleted(newCompleted);
    handleNext();
  };

  const handleReset = () => {
    setActiveStep(0);
    setCompleted({});
  };

  return (
    <div className={classes.root}>
      <Stepper nonLinear activeStep={props.activeStep}>
        {steps.map((label, index) => (
          <Step key={label} disabled={(props.bottom) ? true : false}>
            <StepButton onClick={handleStep(index)} completed={(props.newCompleted) ? (props.newCompleted[index]) : completed[index]}>
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>
    </div>
  );
}
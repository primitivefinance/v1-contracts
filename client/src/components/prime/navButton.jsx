import React, { Component } from 'react';
import { colors } from '../../theme';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';


const styles = theme => ({
    navCard: {
        margin: '16px',
        display: 'flex',
        minHeight: '10%',
        height: '66vh',
        minWidth: '5%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        color: colors.primary,
        backgroundColor: colors.banner,
        '&:hover': {
            backgroundColor: colors.lightblue,
            color: colors.background,
        },
    },
    navButton: {
        backgroundColor: colors.banner,
        color: colors.primary,
        '&:hover' : {
            backgroundColor: colors.primary,
            color: colors.banner,
        },
        letterSpacing: '1px',
        textTransform: 'uppercase',
        height: '100%',
        fontWeight: '700',
    },
});



class NavButton extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;

        return (
            <>
                <Card className={classes.navCard}>
                    <Button 
                        href={this.props.link}
                        className={classes.navButton}
                    >
                        <Typography variant={'h1'}>
                            {this.props.text} Page
                        </Typography>
                    </Button>
                </Card>
            </>
        );
    };
};

export default withStyles(styles)(NavButton);
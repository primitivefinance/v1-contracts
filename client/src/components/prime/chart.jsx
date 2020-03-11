import React, { Component } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import theme from '../../theme';

const styles = theme => ({
    chart: {
        margin: '16px',
    },
    data: {
        display: 'flex',
        flexDirection: 'row',
        marginTop: '16px',
        marginBottom: '16px',
        backgroundColor: colors.banner,
        color: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        
    },
    dataText: {
        textAlign: 'center',
        margin: '16px',
    },
});

const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [
      {
        label: 'Net Profit in USD $',
        fill: false,
        lineTension: 0.1,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: 'rgba(75,192,192,1)',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgba(75,192,192,1)',
        pointHoverBorderColor: 'rgba(220,220,220,1)',
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: [65, 59, 80, 81, 56, 55, 40]
      }
    ]
  };


class Chart extends Component {
    constructor(props) {
        super(props);

    }

    render () {
        const { classes } = this.props;
        let statsData = (this.props.statsData) ? (this.props.statsData) : undefined;
        let tCV;
        let tPV;
        let tNV;
        let hNV;
        let hID
        if(typeof statsData !== 'undefined') {
            tCV = this.props.statsData['tCV'];
            tPV = this.props.statsData['tPV'];
            tNV = this.props.statsData['tNV'];
            hNV = this.props.statsData['hNV'];
            hID = this.props.statsData['hID'];
        };
        return (
            <div className={classes.chart}>
                <Card className={classes.data}>
                    <Typography variant={'h2'} className={classes.dataText}>
                        Total Prime Collateral Value: ${tCV}
                    </Typography>
                    <Typography variant={'h2'} className={classes.dataText}>
                        Total Prime Payment Value: ${tPV}
                    </Typography>
                    <Typography variant={'h2'} className={classes.dataText}>
                        Total Net Value: ${tNV}
                    </Typography>
                    <Typography variant={'h2'} className={classes.dataText}>
                        Most Profitable Prime is #{hID}: ${hNV}
                    </Typography>
                </Card>
                
                <Bar 
                    data={this.props.data}
                    className={classes.chart}
                />
            </div>
        );
    };
};

export default withStyles(styles)(Chart);
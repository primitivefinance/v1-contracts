import createBreakpoints from '@material-ui/core/styles/createBreakpoints'


export const colors = {
    white: "#fff",
    blue: "#2c3b57",
    lightblue: "#F0F8FF",
    activeBlue: "#00BFFF",
    activeGold: "#FFD700",
    palered: "#F08080",
    lightred: "#FFA07A",
    lightgreen: "#00FA9A",
    green: "#98FB98",
    disabledGreen: '#8FBC8F',
    grey: '#C0C0C0',
    lightGrey: '#DCDCDC',
    pink: '#FF69B4',
    cyan: '#5F9EA0',
    fiblue: '#b2fcff',
    lightpink: 'rgb(255,192,203, 0.1)',
}

const breakpoints = createBreakpoints({
    keys: ["xs", "sm", "md", "lg", "xl"],
    values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1800,
    }
})

const mainTheme = {
    typography: {
        fontFamily: ['Open Sans', 'sans-serif'].join(","),
        fontWeight: '400',
        userNextVariants: true,
        h1: {
            fontSize: '1.5rem',
            fontWeight: '350',
            [breakpoints.up('md')]: {
                fontSize: '2.0rem',
            }
        },
        h2: {
            fontSize: '0.75rem',
            fontWeight: '250',
            [breakpoints.up('md')]: {
                fontSize: '1.0rem',
            }
        },
        h3: {
            fontSize: '0.50rem',
            fontWeight: '250',
            [breakpoints.up('md')]: {
                fontSize: '0.70rem',
            }
        },
        h4: {
            fontSize: '0.40rem',
            fontWeight: '250',
            [breakpoints.up('md')]: {
                fontSize: '0.45rem',
            }
        },
    },
    type: 'light',
    overrides: {
        MuiToggleButton: {
            root: {
                borderRadius: '0.75rem',
                textTransform: 'non',
                '&:hover': {
                    backgroundColor: "rgba(50, 130, 250, 0.2",
                },
            },
        },
        MuiStepLabel: {
            label: {
                color: colors.blue,
            },
            active: {
                color: colors.green,
            },
            '.MuiStepLabel': {
                active: colors.green,
                color: colors.green,
            },
        },
        '.MuiStepLabel-label.MuiStepLabel': {
            active: colors.green,
            color: colors.green,
        },
    },
    palette: {
        primary: {
            main: colors.activeBlue,
            lightblue: colors.lightblue,
        },
        background: {
            paper: colors.white,
            default: colors.white,
        },
        button: {
            main: colors.lightgreen,
        },
    },
    breakpoints: breakpoints,
}

export default mainTheme;
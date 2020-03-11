import createBreakpoints from '@material-ui/core/styles/createBreakpoints'


export const colors = {
    white: "#fff",
    blue: "#2c3b57",
    black: "#000000",
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
    cyan: '#00e8c6',
    fiblue: '#b2fcff',
    lightpink: 'rgb(255,192,203, 0.1)',
    brightPurple: '#a350a3',
    redPurple: '#c1436d',
    neonGreen: '#69f0ae',
    slateGrey: '#102027',
    darkPurple: '#2A1B3D',
    primary: '#fff',
    secondary: '#F0F0F0',
    banner: '#23262e',
    highlight: '#fff',
    success: '#98FB98',
    button: '#A239CA',
    background: '#1c1d23',
    darkGrey: '#1c1d23',
    darkBlue: '#070a0e',
    leafGreen: '#88ca6a',
    lightSuccess: '#ccffca',
    
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
    root: {
        backgroundColor: colors.background,
    },
    text: {
        primary: colors.primary,
        secondary: colors.secondary,
    },
    typography: {
        fontFamily: ['Roboto Mono', 'sans-serif'].join(","),
        fontWeight: '500',
        userNextVariants: true,
        secondary: colors.secondary,
        h1: {
            fontSize: '12px',
            fontWeight: '600',
            [breakpoints.up('md')]: {
                fontSize: '16px',
            },
            letterSpacing: '1px',
            textTransform: 'uppercase'
        },
        h2: {
            fontSize: '10px',
            fontWeight: '500',
            [breakpoints.up('md')]: {
                fontSize: '12px',
            },
            letterSpacing: '1px',
            textTransform: 'uppercase',
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
    type: 'dark',
    overrides: {
        MuiToggleButton: {
            root: {
                borderRadius: '0.75rem',
                textTransform: 'non',
            },
        },
        MuiStepLabel: {
            label: {
                color: colors.primary,
                fontSize: '12px',
                fontWeight: '500',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                completed: colors.primary, 
                active: colors.primary,
                '&$active': {
                    color: colors.primary,
                    fontWeight: 500,
                  },
                '&$completed': {
                    color: colors.primary,
                    fontWeight: 500,
                  },
            },
            ' .MuiStepLabel': {
                active: {
                    color: colors.primary,
                },
                completed: colors.primary,
            },
            '& completed': {
                color: colors.primary,
            },
        },

        MuiPaper: {
            root: {
                backgroundColor: colors.background,
                color: colors.primary,
                
            },
        },
        MuiStepIcon: {
            root: {
                color: colors.primary,
                '&$active' : {
                    color: colors.success,
                },
                '&$completed' : {
                    color: colors.success,
                },
            },
            text: {
                color: colors.primary,
                fill: colors.background,
            },
            active: {
                color: colors.success,
            },
        },
        MuiIconButton: {
            root: {
                color: colors.background,
            },
        },
        MuiInputBase: {
            input: {
                backgroundColor: colors.primary,
                color: colors.banner,
                '&:hover': {
                    backgroundColor: colors.lightSuccess,
                },
                width: '100%',
                borderRadius: '4px',
                padding: '4px',
                margin: '4px',
            },
        },
        MuiSelect: {
            outlined: {
                borderRadius: '0px',
            },
            backgroundColor: colors.banner,
            selectMenu: {
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                '&:hover': {
                    backgroundColor: colors.lightSuccess,
                },
            },
        },

        MuiTypography: {
            root: {
                MuiStepLabel: {
                    '& completed': {
                        color: colors.primary,
                    },
                },
            },
            colorTextSecondary: {
                color: colors.primary,
            },
            body2: {
                fontWeight: '500',
                letterSpacing: '1px',
                textTransform: 'uppercase',
            },
        },
        MuiSvgIcon: {
            root: {
                paddingLeft: '12px',
                paddingRight: '12px'
            },
        },
        MuiButton: {
            contained: {
                backgroundColor: colors.secondary,
                color: colors.banner,
                '&:hover' : {
                    backgroundColor: colors.primary,
                    color: colors.banner,
                },
            },
        },
        Column: {
            formControl: {
                backgroundColor: colors.banner,
            }
        },
        MuiFormControl: {
            root: {
                color: colors.primary,
                backgroundColor: colors.banner,
            },
        },
    },
    palette: {
        primary: {
            main: colors.primary,
            dark: colors.blue,
        },
        secondary: {
            main: colors.secondary,
            dark: colors.blue,
        },
        success: {
            main: colors.success,
            dark: colors.blue,
        },
        background: {
            paper: colors.background,
            default: colors.white,
            dark: colors.blue,
        },
        button: {
            main: colors.lightgreen,
        },
    },
    breakpoints: breakpoints,
}

export default mainTheme;
import createBreakpoints from '@material-ui/core/styles/createBreakpoints'


export const colors = {
    white: "#fff",
    blue: "#2c3b57",
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
            fontSize: '2.0rem',
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
        }
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
    },
    palette: {
        primary: {
            main: colors.blue,
        },
        background: {
            paper: colors.white,
            default: colors.white,
        }
    },
    breakpoints: breakpoints,
}

export default mainTheme;
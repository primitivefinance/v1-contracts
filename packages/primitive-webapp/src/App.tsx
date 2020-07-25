import React from 'react'
import { ThemeProvider } from 'styled-components'

import TopBar from './components/TopBar'

import Market from './views/Market'

import theme from './theme'

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <TopBar />
            <Market />
        </ThemeProvider>
    )
}

export default App
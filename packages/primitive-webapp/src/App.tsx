import React from 'react'
import { ThemeProvider } from 'styled-components'
import { BrowserRouter as Router } from 'react-router-dom'

import TopBar from './components/TopBar'

import Market from './views/Market'

import theme from './theme'

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <Router>
                <TopBar />
                <Market />
            </Router>
        </ThemeProvider>
    )
}

export default App
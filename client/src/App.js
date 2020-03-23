import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom';

import mainTheme from './theme'
import Home from './components/home';
import PrimeV3 from './components/prime/primeV3';

import {
  CSSTransition,
  TransitionGroup
} from 'react-transition-group';

class App extends Component {
  render () {

    const supportsHistory = 'pushState' in window.history;
    return (
      <MuiThemeProvider theme={createMuiTheme(mainTheme) }>
        <Router forceRefresh={!supportsHistory}>
          <Route
            render={({location}) => {
              const { pathname} = location;
              return (
                <TransitionGroup>
                  <CSSTransition
                    key={pathname.href}
                    classNames='page'
                    timeout={{
                      enter: 1000,
                      exit: 1000,
                    }}
                  >
                    <Route 
                      location={location}
                      render={() => (
                        <>
                          <Route exact path='/' component={Home}/>
                          <Route exact path='/home' component={Home}/>
                          <Route exact path='/prime' component={PrimeV3}/>
                        </>
                      )}
                    >
                    </Route>
                  </CSSTransition>
                </TransitionGroup>
              );
            }}
          >
          </Route>
        </Router>
      </MuiThemeProvider>
    );
  }
}

export default App;

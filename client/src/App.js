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
import Prime from './components/prime/prime';

class App extends Component {
  render () {
    return (
      <MuiThemeProvider theme={createMuiTheme(mainTheme) }>
        <Router>
          <Switch>
            <Route exact path='/' component={Home}/>
            <Route path='/home' component={Home}/>
            <Route path='/prime' component={Prime}/>
          </Switch>
        </Router>
      </MuiThemeProvider>
    );
  }
}

export default App;

import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Web3ReactProvider } from "@web3-react/core";
import Web3 from "web3";
import ethers from "ethers";
import styled from "styled-components";

// == Pages ==
import { Trade } from "./pages/Trade";
import { Home } from "./pages/Home";
import { Otc } from "./pages/Otc";
import { Typeform } from "./pages/Typeform";

function getLibrary(provider, connector) {
    return new ethers.providers.Web3Provider(provider);
}

export interface IConnected {
    web3: Web3;
    address: string;
    networkId: number;
    chainId: number;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

function App() {
    return (
        <>
            <Web3ReactProvider getLibrary={getLibrary}>
                <Router>
                    <Container className="App">
                        <Switch>
                            <Route exact path="/">
                                <Home />
                            </Route>
                        </Switch>

                        <Switch>
                            <Route path="/trade">
                                <Trade />
                            </Route>
                        </Switch>

                        <Switch>
                            <Route path="/test">
                                <Typeform />
                            </Route>
                        </Switch>

                        <Switch>
                            <Route path="/otc">
                                <Otc />
                            </Route>
                        </Switch>
                    </Container>
                </Router>
            </Web3ReactProvider>
        </>
    );
}

export default App;

import React, { FunctionComponent } from "react";
import styled from "styled-components";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import ethers from "ethers";
type PageProps = {
    children: any;
    provider?: ethers.providers.Provider | ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    disconnect?: Function;
    web3React?: any;
    connect?: Function;
};

const View = styled.div`
    width: 100%;
    background-color: #040404;
`;

export const Page: FunctionComponent<PageProps> = ({
    children,
    provider,
    signer,
    disconnect,
    connect,
    web3React
}) => {
    return (
        <div>
            <Navbar
                title='Primitive'
                provider={provider}
                signer={signer}
                disconnect={disconnect}
                web3React={web3React}
                connect={connect}
            />
            <View>{children}</View>
            <Footer title=''>Footer</Footer>
        </div>
    );
};

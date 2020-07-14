import React, { FunctionComponent, useState } from "react";
import styled from "styled-components";
import Navbar from "../Navbar";
import Footer from "../Footer";

type PageProps = {
    children: any;
    web3React?: any;
    injected?: any;
};

const View = styled.div`
    width: 100%;
    background-color: #040404;
`;

const Page: FunctionComponent<PageProps> = ({
    children,
    web3React,
    injected,
}) => {
    return (
        <View>
            <Navbar
                title="Primitive"
                web3React={web3React}
                injected={injected}
            />
            {children}
            <Footer>Footer</Footer>
        </View>
    );
};

export default Page;

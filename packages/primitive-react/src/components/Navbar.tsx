import React, { FunctionComponent, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ReactComponent as PrimitiveLogo } from "../icons/primitivelogo.svg";
import { IConnected } from "../App";
import { Blockie } from "./utils/Blockie";
import styled from "styled-components";
import ethers from "ethers";
import { connect } from "http2";
const { AddressZero } = ethers.constants;

type NavbarProps = {
    title: string;
    provider?: ethers.providers.Provider | ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    connected?: IConnected;
    web3React?: any;
    disconnect?: Function;
    connect?: Function;
};
const ellipseAddress = (address: string): string => {
    let width: number = 5;
    let newAddress: string = `${address.slice(0, width)}...${address.slice(
        -width
    )}`;
    return newAddress;
};

const Nav = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: row;
    background-color: #040404;
    position: fixed;
    width: 100%;
`;

const H1 = styled.h1`
    font-family: "Nunito Sans";
    font-size: 24px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
    text-decoration: none;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    padding: 4px;
`;

const NavRow = styled.div`
    display: flex;
    width: 100%;
    justify-content: flex-end;
    padding-right: 16px;
`;

const Container = styled.div`
    display: flex;
    justify-content: center;
    padding: 8px;
    align-self: center;
`;

export const Navbar: FunctionComponent<NavbarProps> = ({
    title,
    connected,
    disconnect,
    provider,
    web3React,
    signer,
    connect
}) => {
    const [account, setAccount] = useState<string>(AddressZero);

    useEffect(() => {
        async function address() {
            if (web3React) {
                setAccount(web3React.account || AddressZero);
            }
        }
        address();
    }, [account, web3React]);

    return (
        <div>
            <Nav>
                <div
                    style={{
                        display: "flex",
                        alignSelf: "center",
                        textAlign: "left",
                        alignContent: "center",
                    }}
                >
                    <PrimitiveLogo width={50} height={50} />
                </div>
                <div style={{ alignSelf: "center" }}>
                    <NavLink style={{ textDecoration: "none" }} to='/'>
                        <H1>{title}</H1>
                    </NavLink>
                </div>

                {signer ? (
                    <>
                        <NavRow>
                            <Container>
                                <Blockie address={account} />
                            </Container>
                            <Container>
                                <button
                                    disabled={false}
                                    onClick={
                                        disconnect
                                            ? (account != AddressZero) 
                                                ? async () => disconnect()
                                                : connect 
                                                    ? async () => connect() 
                                                    : () => {console.log("err no func call")}
                                            : () => {console.log("err no func call")}
                                    }
                                >
                                    <p>{ellipseAddress(account)}</p>
                                </button>
                            </Container>
                        </NavRow>
                    </>
                ) : (
                    <> </>
                )}
            </Nav>
        </div>
    );
};

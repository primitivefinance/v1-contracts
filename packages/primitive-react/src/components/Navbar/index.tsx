import React, { FunctionComponent, useState, useEffect } from "react";
import { ReactComponent as PrimitiveLogo } from "../../icons/primitivelogo.svg";
import { IConnected } from "../../App";
import { Blockie } from "../utils/Blockie";
import ethers from "ethers";
import styled from "styled-components";
import NavbarLink from "./NavbarLink";
import NavRow from "./NavRow";
import Wrapper from "./Wrapper";
import Address from "../Address";
import Button from "../Button";
import H1 from "../H1";
import { connect, disconnect } from "../../lib/web3";
const { AddressZero } = ethers.constants;

type NavbarProps = {
    title?: string;
    web3React?: any;
    injected?: any;
};

const Nav = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: row;
    background-color: #040404;
    position: fixed;
    width: 100%;
`;

const Navbar: FunctionComponent<NavbarProps> = ({
    title,
    web3React,
    injected,
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
        <Nav>
            <Wrapper>
                <PrimitiveLogo width={50} height={50} />
            </Wrapper>
            <Wrapper>
                <NavbarLink to="/">
                    <H1>{title}</H1>
                </NavbarLink>
            </Wrapper>

            {web3React ? (
                <NavRow>
                    <Wrapper>
                        <Button
                            style={{ minHeight: "5vmin" }}
                            disabled={false}
                            onClick={
                                disconnect
                                    ? account != AddressZero
                                        ? async () => disconnect(web3React)
                                        : connect
                                        ? async () =>
                                              connect(web3React, injected)
                                        : () => {
                                              console.log("err no func call");
                                          }
                                    : () => {
                                          console.log("err no func call");
                                      }
                            }
                        >
                            <Address account={account} />
                        </Button>
                    </Wrapper>
                </NavRow>
            ) : (
                <> </>
            )}
        </Nav>
    );
};

export default Navbar;

import React, { FunctionComponent, useEffect, useState } from "react";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { H1, Row } from "./Home";
import styled from "styled-components";
import ethers from "ethers";
import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { buy } from "../lib/otc";
const { AddressZero } = ethers.constants;

export const Button = styled.button`
    border-style: solid;
    border-width: medium;
    border-color: #f9f9f9;
    border-radius: 12px;
    justify-content: center;
    text-decoration: none !important;
    @media (max-width: 375px) {
        width: 24vmin;
    }
    :hover {
        background-color: #f9f9f9;
        color: #000000;
    }
    :disabled {
        background-color: #acacac;
        color: #444444;
    }
    width: 25%;
    margin: 4px;
    font-family: "Nunito Sans";
    font-size: 18px;
    font-weight: 600;
    text-decoration: none;
    text-transform: uppercase;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    padding: 8px;
    cursor: pointer;
`;

export const Form = styled.form`
    padding: 4px;
    display: flex;
    flex-direction: column;
`;

export const Units = styled.p`
    padding-left: 4px;
    font-size: 12px;
    font-family: "Nunito Sans";
    text-decoration: none;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    width: 25%;
`;

export const Details = styled.p`
    display: flex;
    padding-left: 4px;
    font-size: 18px;
    @media (max-width: 375px) {
        font-size: 10px;
    }
    font-family: "Nunito Sans";
    text-decoration: none;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    justify-content: center;
    align-items: center;
`;

export const DetailsRow = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 4px;
    width: 25%;
    align-self: center;
    justify-content: center;
`;

export const FormRow = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 4px;
    width: 75%;
    align-self: center;
`;

export const Label = styled.label`
    font-family: "Nunito Sans";
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: #d9d9d9;
    text-align: left;
    align-self: left;
    padding: 4px;
    width: 25%;
    @media (max-width: 375px) {
        font-size: 10px;
    }
`;

export const Input = styled.input`
    display: flex;
    justify-content: end;
    padding: 4px;
    width: 50%;
    @media (max-width: 375px) {
        font-size: 10px;
    }
`;

export const Submit = styled.input`
    border-style: solid;
    border-width: medium;
    border-color: #f9f9f9;
    border-radius: 12px;
    justify-content: center;
    text-decoration: none !important;
    @media (max-width: 375px) {
        width: 24vmin;
    }
    :hover {
        background-color: #67e859;
        color: #000000;
    }
    :disabled {
        background-color: #acacac;
        color: #444444;
    }
    width: 25%;
    margin: 4px;
    font-family: "Nunito Sans";
    font-size: 18px;
    font-weight: 600;
    text-decoration: none;
    text-transform: uppercase;
    text-align: center;
    align-self: center;
    padding: 8px;
    cursor: pointer;
    text-align: center;
    align-self: center;
    padding-top: 12px;
    width: 50%;
    border-radius: 12px;
    @media (max-width: 375px) {
        font-size: 10px;
    }
`;

type OtcProps = {
    title?: string;
    web3?: any;
};

export type OrderDetails = {
    tokenId: number;
    orderAmount: number;
    isBuyOrder: boolean;
};

export const Column = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 50vmin;
`;

export const Otc: FunctionComponent<OtcProps> = ({ title, web3 }) => {
    const [isReady, setIsReady] = useState<boolean>(true);
    const [strike, setstrike] = useState<string>("0");
    const [bid, setbid] = useState<string>("0");
    const [ask, setask] = useState<string>("0");
    const [size, setsize] = useState<string>("0");
    const injected = new InjectedConnector({
        supportedChainIds: [1, 3, 4, 5, 42],
    });
    const web3React = useWeb3React();

    const [provider, setProvider] = useState<ethers.providers.Web3Provider>(
        new ethers.providers.Web3Provider(async () => injected.getProvider())
    );
    const [signer, setSigner] = useState<ethers.Signer>(provider.getSigner());

    const [account, setAccount] = useState<string>(AddressZero);
    const connect = async () => {
        try {
            await web3React.activate(injected);
        } catch (err) {
            console.log(err);
        }
        console.log(web3React);
    };

    const disconnect = async () => {
        try {
            await web3React.deactivate();
        } catch (err) {
            console.log(err);
        }
    };

    const getAccount = async () => {
        let address = (await injected.getAccount()) || AddressZero;
        setAccount(address);
    };

    const deployOtc = async () => {
        console.log("deploying otc", { strike, bid, ask, size });
        await buy(signer, AddressZero, AddressZero);
    };

    const agree = async () => {
        let otcFactory = "0x39d98157dcA7Aab8728519b97BACB286fA030eC8";
        let quoteToken = "0xd874E8f218e82567a9887642452D2406e542355E";
        console.log("woop", { strike, bid, ask, size });
        await buy(signer, otcFactory, quoteToken);
    };

    const handleInputChange = (event) => {
        const target = event.target;
        const value = target.name === "isGoing" ? target.checked : target.value;
        const name = target.name;
    };

    useEffect(() => {
        connect();
        getAccount();
    }, [account]);

    return (
        <Page
            provider={provider}
            signer={signer}
            disconnect={disconnect}
            web3React={web3React}
            connect={connect}
        >
            <div id="otc:page">
                {web3React.active ? (
                    isReady ? (
                        <Column style={{ height: "100vh" }}>
                            <H1>OTC trade ready to go!</H1>
                            <Details>Details</Details>
                            <DetailsRow>
                                <Details>Strike: {strike}</Details>
                                <Details>Bid: {bid}</Details>
                                <Details>Ask: {ask}</Details>
                                <Details>Size: {size}</Details>
                            </DetailsRow>
                            <Details>Option parameters</Details>
                            <DetailsRow>
                                <Details>Underlying: {strike}</Details>
                                <Details>Quote: {bid}</Details>
                                <Details>Base: {ask}</Details>
                                <Details>Expiry: {size}</Details>
                            </DetailsRow>

                            <Button
                                onClick={async () => {
                                    agree();
                                }}
                                style={{
                                    backgroundColor: "#f9f9f9",
                                    color: "#000000",
                                }}
                            >
                                Agree
                            </Button>
                        </Column>
                    ) : (
                        <Column id="otc:card" style={{ height: "100vh" }}>
                            <Card>
                                <H1>New COMP Call Option Expiring 8/1/2020</H1>
                                <Form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        deployOtc();
                                    }}
                                >
                                    <FormRow>
                                        <Label>Strike Price</Label>
                                        <Input
                                            type="text"
                                            value={strike}
                                            onChange={(e) =>
                                                setstrike(e.target.value)
                                            }
                                        ></Input>
                                        <Units>USDC</Units>
                                    </FormRow>
                                    <FormRow>
                                        <Label>Bid:</Label>
                                        <Input
                                            type="text"
                                            value={bid}
                                            onChange={(e) =>
                                                setbid(e.target.value)
                                            }
                                        ></Input>
                                        <Units>USDC</Units>
                                    </FormRow>
                                    <FormRow>
                                        <Label>Ask:</Label>
                                        <Input
                                            type="text"
                                            value={ask}
                                            onChange={(e) =>
                                                setask(e.target.value)
                                            }
                                        ></Input>
                                        <Units>USDC</Units>
                                    </FormRow>
                                    <FormRow>
                                        <Label>Size:</Label>
                                        <Input
                                            type="text"
                                            value={size}
                                            onChange={(e) =>
                                                setsize(e.target.value)
                                            }
                                        ></Input>
                                        <Units>Lot Size</Units>
                                    </FormRow>
                                    <Submit type="submit" value="Submit" />
                                </Form>
                            </Card>
                        </Column>
                    )
                ) : (
                    <>
                        {" "}
                        <Column id="otc:upper-body" style={{ height: "100vh" }}>
                            <H1>Connect to the App</H1>
                            <Button
                                onClick={async () => connect()}
                                style={{
                                    backgroundColor: "#f9f9f9",
                                    color: "#000000",
                                }}
                            >
                                Connect
                            </Button>
                            <Button
                                onClick={async () => disconnect()}
                                style={{
                                    backgroundColor: "#f9f9f9",
                                    color: "#000000",
                                }}
                            >
                                Disconnect
                            </Button>
                        </Column>
                    </>
                )}
            </div>
        </Page>
    );
};

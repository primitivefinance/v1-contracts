import React, { FunctionComponent } from "react";
import Page from "../components/Page";
import styled from "styled-components";

type HomeProps = {
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
    height: 100vmin;
`;

export const Row = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    @media (max-width: 375px) {
        flex-direction: column;
    }
    align-items: center;
    margin: 8px;
`;

/* const Typography = styled.p`
    font-family: "Nunito Sans";
    font-size: 12px;
    font-weight: 500;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    padding: 4px;
    @media (max-width: 375px) {
        font-size: 10px;
    }
`; */

export const H1 = styled.h1`
    font-family: "Nunito Sans";
    font-size: 48px;
    font-weight: 600;
    text-decoration: none;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    padding: 4px;
    @media (max-width: 375px) {
        font-size: 24px;
    }
`;

/* const CardBody = styled.p`
    font-family: "Nunito Sans";
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    padding: 4px;
    @media (max-width: 375px) {
        font-size: 10px;
    }
    max-width: 100%;
`; */

export const Button = styled.a`
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
`;

/* const Card = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-wrap: wrap;
    flex: 0 1 24%;
    background-color: #1b1b1b;
    border-radius: 12px;
    margin: 8px;
    padding: 8px;
`; */

export const Home: FunctionComponent<HomeProps> = ({ title, web3 }) => {
    return (
        <Page>
            <div>
                <Column>
                    <Row>
                        {/* <PrimitiveLogo height={100} width={100} /> */}
                    </Row>
                    <Row>
                        <H1>The options market protocol.</H1>
                    </Row>
                    <Row>
                        <Button
                            href="/test"
                            style={{
                                backgroundColor: "#f9f9f9",
                                color: "#000000",
                            }}
                        >
                            App
                        </Button>
                        <Button href="https://docs.primitive.finance">
                            Docs
                        </Button>
                        <Button href="/otc">Otc</Button>
                        <Button href="/trade">Testnet</Button>
                    </Row>
                </Column>

                <Column style={{ backgroundColor: "#f9f9f9" }}>
                    <H1 style={{ color: "#000000" }}>
                        Trade crypto options permissionlessly on Ethereum.
                    </H1>
                </Column>
                <Column>
                    <H1 style={{ color: "#f9f9f9" }}>Q4 2020</H1>
                </Column>

                <Column style={{ backgroundColor: "#f9f9f9" }}>
                    <H1 style={{ color: "#000000" }}>Join our community.</H1>
                    <Row>
                        <Button
                            href="https://discord.gg/rzRwJ4K"
                            style={{
                                borderColor: "#000000",
                                color: "#f9f9f9",
                                backgroundColor: "#000000",
                            }}
                        >
                            Discord
                        </Button>
                    </Row>
                </Column>
            </div>
        </Page>
    );
};

import React, { FunctionComponent, useEffect, useState } from "react";
import Page from "../../components/Page";
import Button from "../../components/Button";
import H1 from "../../components/H1";
import H2 from "../../components/H2";
import H3 from "../../components/H3";
import TableRow from "./TableRow";
import styled from "styled-components";
import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import Section from "./Section";
import Dropdown from "./Dropdown";
import Cart from "./Cart";
import { safeMint } from "../../lib/option";
import ethers from "ethers";

type TradeProps = {
    web3?: any;
};

export type OrderDetails = {
    tokenId: number;
    orderAmount: number;
    isBuyOrder: boolean;
};

export const View = styled.div`
    display: flex;
    flex-direction: column;
    max-width: calc(1248px + 16px * 2);
    padding: 100px 16px 0 16px;
    margin: 0 auto;
    margin-right: 0;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    display: flex;
    flex-direction: row;
    width: calc(1248px + 16px * 2);
`;

const Table = styled.div`
    display: flex;
    flex-direction: column;
    width: calc(1248px + 16px * 2);
`;

const Body = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
    width: calc(1248px + 16px * 2);
`;

const Trade: FunctionComponent<TradeProps> = ({ web3 }) => {
    const [cart, setCart] = useState<string[]>(["Tester"]);

    const injected = new InjectedConnector({
        supportedChainIds: [1, 3, 4, 5, 42],
    });
    const web3React = useWeb3React();
    /* const [provider, setProvider] = useState<ethers.providers.Web3Provider>(
        new ethers.providers.Web3Provider(window.ethereum)
    );
    const [signer, setSigner] = useState<ethers.Signer>(provider.getSigner());

    const [account, setAccount] = useState<string>(AddressZero);
    

    const getAccount = async () => {
        setAccount(await signer.getAddress());
    }; */

    /* const exercise = async () => {
        const trader: any = new Trader(provider, signer);
        const option: string = "0xf0481628ec335e0Cc0c0383866CfE88eE4a55c9D";
        const result = await trader.safeExercise(option, 1);
        console.log(result);
    }; */

    const addToCart = (option) => {
        setCart(cart.concat(option.toString()));
    };

    const submitOrder = async () => {
        console.log("Submitting order for: ");
        cart.map((v) => console.log(v));
        const provider: ethers.providers.Web3Provider = web3React.library;
        try {
            await safeMint(
                provider,
                "0x6AFAC69a1402b810bDB5733430122264b7980b6b",
                1
            );
        } catch (err) {
            console.log(err);
        }
    };

    const tableHeaders = [
        "Price",
        "Breakeven",
        "Open Interest",
        "Volume 24hr",
        "% Change 24hr",
        "Price",
    ];

    const options = ["0x6AFAC69a1402b810bDB5733430122264b7980b6b"];

    return (
        <Page web3React={web3React} injected={injected}>
            <Row>
                <Column style={{ width: "80%" }}>
                    <View id="trade:page">
                        <Section id="trade:header">
                            <Header>
                                <Column style={{ width: "25%" }}>
                                    <H2>Ether</H2>
                                    <H2>$ {`240.50`}</H2>
                                    <Row>
                                        <H3 color="lightgreen">+ {`4.53`}%</H3>
                                        <H3 color="grey">Today</H3>
                                    </Row>
                                </Column>
                            </Header>
                        </Section>
                        <Section id="trade:body">
                            <Body id="trade:body/container">
                                <Row style={{ width: "25%" }}>
                                    <Button selected>Buy</Button>
                                    <Button>Sell</Button>
                                </Row>
                                <Row style={{ width: "25%" }}>
                                    <Button selected>Calls</Button>
                                    <Button>Puts</Button>
                                </Row>
                                <Row style={{ width: "50%" }}>
                                    <Dropdown />
                                </Row>
                            </Body>
                        </Section>
                        <Section
                            id="trade:table-header"
                            style={{ marginBottom: "0" }}
                        >
                            <Body id="table-header">
                                <Row style={{ width: "80%" }}>
                                    {tableHeaders.map((v) => (
                                        <H3 style={{ width: "20%" }}>{v}</H3>
                                    ))}
                                </Row>
                            </Body>
                        </Section>
                    </View>

                    <div style={{ borderTop: "solid 0.1em lightgrey" }} />
                    <View style={{ paddingTop: "0px", height: "75vmin" }}>
                        <Section id="trade:table">
                            <Table>
                                <TableRow
                                    option={options[0]}
                                    addToCart={addToCart}
                                />
                                <TableRow />
                                <TableRow />
                                <TableRow />
                                <TableRow />
                            </Table>
                        </Section>
                    </View>
                </Column>
                <Column style={{ paddingTop: "125px" }}>
                    <Row>
                        <Section>
                            <Cart cart={cart} submitOrder={submitOrder} />
                        </Section>
                    </Row>
                </Column>
            </Row>
        </Page>
    );
};

export default Trade;

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
import Loading from "../../components/Loading";
import {
    safeMint,
    estimateGas,
    estimateMintGas,
    getOptionParameters,
} from "../../lib/option";
import ethers from "ethers";
import Header from "./Header";
import Row from "../../components/Row";
import Column from "../../components/Column";
import Body from "./Body";
import PriceContext from "./context/PriceContext";
import {
    Trader,
    Option,
    UniswapFactory,
    UniswapRouter,
    UniswapPair,
    Token,
} from "@primitivefi/sdk";
import TraderDeployed from "@primitivefi/contracts/deployments/rinkeby/Trader.json";
import Stablecoin from "@primitivefi/contracts/deployments/rinkeby/USDC.json";
import Ether from "@primitivefi/contracts/deployments/rinkeby/ETH.json";
import { parseEther } from "ethers/utils";
import { getPair } from "../../lib/pool";

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

const Table = styled.div`
    display: flex;
    flex-direction: column;
    width: calc(1248px + 16px * 2);
`;

const TableHeader = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
    width: calc(1248px + 16px * 2);
`;

const ethPriceApi =
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true";

const Trade: FunctionComponent<TradeProps> = ({ web3 }) => {
    const [cart, setCart] = useState<string[]>(["Tester"]);
    const [isBuy, setIsBuy] = useState<boolean>(true);
    const [isCall, setIsCall] = useState<boolean>(true);
    const [expiry, setExpiry] = useState<any>();
    const [gasSpend, setGasSpend] = useState<any>();
    const [parameters, setParameters] = useState<any>();
    const [tableData, setTableData] = useState<any>();

    const injected = new InjectedConnector({
        supportedChainIds: [1, 3, 4, 5, 42],
    });
    const web3React = useWeb3React();

    const addToCart = (option) => {
        setCart(cart.concat(option.toString()));
    };

    const update = (isBuy, isCall) => {
        setIsCall(isCall);
        setIsBuy(isBuy);
    };

    const submitOrder = async () => {
        console.log("Submitting order for: ");
        cart.map((v) => console.log(v));
        const provider: ethers.providers.Web3Provider = web3React.library;
        try {
            let gas = await estimateMintGas(
                provider,
                "0x6AFAC69a1402b810bDB5733430122264b7980b6b",
                1
            );
            setGasSpend(gas.toString());
        } catch (err) {
            console.log(err);
        }
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
        "Strike",
        "Breakeven",
        "Open Interest",
        "Volume 24hr",
        "% Change 24hr",
        "Price",
    ];

    const options = ["0x6AFAC69a1402b810bDB5733430122264b7980b6b"];
    const getTable = async () => {
        let data = {};
        for (let i = 0; i < options.length; i++) {
            let table = await getTableData(options[i]);
            data[i] = table;
        }
        return data;
    };

    useEffect(() => {
        async function updateParams() {
            if (web3React.library) {
                const provider: ethers.providers.Web3Provider =
                    web3React.library;
                let params = await getOptionParameters(
                    provider,
                    "0x6AFAC69a1402b810bDB5733430122264b7980b6b"
                );
                setParameters(params);
                let data = await getTable();
                setTableData(data);
            }
        }
        updateParams();
    }, [web3React.library]);

    const getPairData = async () => {
        const optionAddress = "0x6AFAC69a1402b810bDB5733430122264b7980b6b";
        const provider = web3React.library;
        const pairAddress = await getPair(web3React.library, optionAddress);
        // need price to calc premium + breakeven, total liquidity for option, volume
        const pair = new UniswapPair(pairAddress, await provider.getSigner());
        const token0 = await pair.token0();
        const reserves = await pair.getReserves();
        let premium = 0;
        let openInterest = 0;
        if (token0 == optionAddress) {
            premium = await pair.price0CumulativeLast();
            openInterest = reserves._reserve0;
        } else {
            premium = await pair.price1CumulativeLast();
            openInterest = reserves._reserve1;
        }

        if (premium == 0) {
            premium = reserves._reserve0 / reserves._reserve1;
        }
        return { premium, openInterest };
    };

    const getPriceData = () => {
        return ethereum.usd;
    };

    const getOptionParams = async (optionAddress) => {
        const provider = web3React.library;
        const params = await getOptionParameters(provider, optionAddress);
        return params;
    };

    const getTableData = async (optionAddress) => {
        let params = await getOptionParams(optionAddress);
        let price = getPriceData();
        let pair = await getPairData();
        return { params, price, pair };
    };

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [ethereum, setEthereum] = useState<any>();

    // Note: the empty deps array [] means
    // this useEffect will run once
    // similar to componentDidMount()
    useEffect(() => {
        fetch(ethPriceApi)
            .then((res) => res.json())
            .then(
                (result) => {
                    setIsLoaded(true);
                    setEthereum(result.ethereum);
                    console.log(result);
                },
                // Note: it's important to handle errors here
                // instead of a catch() block so that we don't swallow
                // exceptions from actual bugs in components.
                (error) => {
                    setIsLoaded(true);
                    setError(error);
                    console.log(isLoaded);
                }
            );
    }, []);

    const testFunc = async () => {
        if (web3React.library) {
            const signer = await web3React.library.getSigner();
            const trader = new Trader(TraderDeployed.address, signer);
            console.log(trader, await trader.weth());
            const optionAddr = "0x6AFAC69a1402b810bDB5733430122264b7980b6b";
            const option = new Option(optionAddr, signer);
            console.log(option, await option.underlyingToken());
            const uniFac = new UniswapFactory(
                "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
                signer
            );
            console.log(await uniFac.getPair(optionAddr, Stablecoin.address));
            const uniRoutAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
            const uniRout = new UniswapRouter(uniRoutAddr, signer);
            const stablecoin = new Token(Stablecoin.address, signer);
            const optionToken = new Token(optionAddr, signer);
            const underlyingToken = new Token(Ether.address, signer);
            const poolAddr = await uniFac.getPair(
                optionAddr,
                Stablecoin.address
            );
            console.log({ poolAddr });
            /* try {
                await stablecoin.approve(uniRoutAddr, parseEther("10000000"));
                await optionToken.approve(uniRoutAddr, parseEther("10000000"));
                console.log(
                    await signer.getAddress(),
                    (
                        await underlyingToken.balanceOf(
                            await signer.getAddress()
                        )
                    ).toString()
                );
                await underlyingToken.approve(
                    uniRoutAddr,
                    parseEther("10000000")
                );
                await trader.safeMint(
                    optionAddr,
                    parseEther("5000"),
                    await signer.getAddress()
                );
                console.log(
                    (
                        await option.balanceOf(await signer.getAddress())
                    ).toString()
                );
                await uniRout.addLiquidity(
                    optionAddr,
                    Stablecoin.address,
                    parseEther("5000"),
                    parseEther("5000"),
                    1,
                    1,
                    await signer.getAddress(),
                    +new Date() + 1000000
                );
            } catch (err) {
                console.log(err);
            } */
        }
    };

    return (
        <Page web3React={web3React} injected={injected}>
            <Row>
                <Button
                    onClick={async () => {
                        options.map((v) => getTableData(v));
                    }}
                >
                    Test
                </Button>
                <PriceContext.Provider value={{ ethereum, isLoaded, error }} />
                <Column style={{ width: "80%" }}>
                    <View id="trade:page">
                        <Section id="trade:header">
                            <Header />
                        </Section>
                        <Section id="trade:body">
                            <Body update={update} />
                        </Section>
                        <Section
                            id="trade:table-header"
                            style={{ marginBottom: "0" }}
                        >
                            <TableHeader id="table-header">
                                <Row style={{ width: "80%" }}>
                                    {tableHeaders.map((v) => (
                                        <H3 style={{ width: "20%" }}>{v}</H3>
                                    ))}
                                </Row>
                            </TableHeader>
                        </Section>
                    </View>

                    <div style={{ borderTop: "solid 0.1em lightgrey" }} />
                    <View style={{ paddingTop: "0px", height: "75vmin" }}>
                        <Section id="trade:table">
                            <Table>
                                {tableData ? (
                                    options.map((v, i) => (
                                        <TableRow
                                            option={v}
                                            addToCart={addToCart}
                                            data={tableData[i]}
                                        />
                                    ))
                                ) : (
                                    <Loading />
                                )}
                            </Table>
                        </Section>
                    </View>
                </Column>
                <Column style={{ paddingTop: "125px" }}>
                    <Row>
                        <Section>
                            <Cart
                                cart={cart}
                                submitOrder={submitOrder}
                                gasSpend={gasSpend}
                                ethPrice={ethereum?.usd}
                            />
                        </Section>
                    </Row>
                </Column>
            </Row>
        </Page>
    );
};

export default Trade;

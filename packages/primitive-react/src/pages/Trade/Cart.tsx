import React, { FunctionComponent, useEffect, useState } from "react";
import styled from "styled-components";
import H1 from "../../components/H1";
import H2 from "../../components/H2";
import H3 from "../../components/H3";
import Button from "../../components/Button";
import Row from "../../components/Row";
import Column from "../../components/Column";

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: auto;
`;

const Card = styled.div`
    display: flex;
    flex-direction: column;
    background-color: #090909;
    height: 36em;
    width: 18em;
    border-radius: 2em;
    padding: 16px;
    margin: 0 auto;
`;

const Inner = styled.div`
    display: flex;
    flex-direction: column;
    background-color: #070707;
    height: 15em;
    border-radius: 2em;
    padding: 16px;
    margin-top: 7.5em;
`;

const Left = styled(H3)`
    display: flex;
    justify-content: flex-start;
    width: 50%;
`;

const Right = styled(H3)`
    display: flex;
    justify-content: flex-end;
    width: 50%;
`;

interface CartProps {
    cart: string[];
    submitOrder: Function;
    gasSpend?: string;
    ethPrice?: string;
    total?: string;
}

const gasPriceApi = `https://ethgasstation.info/api/ethgasAPI.json`;

const Cart: FunctionComponent<CartProps> = ({
    cart,
    submitOrder,
    gasSpend,
    ethPrice,
    total,
}) => {
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [gas, setGas] = useState<any>();
    const [totalGasCost, setTotalGasCost] = useState<any>();
    const [premium, setPremium] = useState<any>("");

    const calculateGasCost = async () => {
        let cost;
        if (gas) {
            cost = gas / 10 ** 9;
            if (gasSpend) {
                cost = cost * +gasSpend;
                if (ethPrice) {
                    cost = cost * +ethPrice;
                    console.log(cost);
                }
            } else {
                cost = cost * 100000 * 250;
            }
        }
        return cost;
    };

    useEffect(() => {
        async function calcGas() {
            const total = await calculateGasCost();
            setTotalGasCost(total);
        }
        calcGas();
    });

    useEffect(() => {
        fetch(gasPriceApi)
            .then((res) => res.json())
            .then(
                (result) => {
                    setIsLoaded(true);
                    setGas(result.fast / 10);
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
    }, [cart]);
    return (
        <Wrapper>
            <Card>
                <div
                    id="card-header"
                    style={{ borderBottom: "solid 0.1em grey" }}
                >
                    <H1>Trade</H1>
                </div>
                <div id="card-body">
                    <H3 color="grey">Details</H3>
                    <Column>
                        {cart.map((v, index) => (
                            <Row style={{ width: "100%" }}>
                                <Left>
                                    {cart[index].substr(0, 6).concat("..")}
                                </Left>
                                <Right>${1}</Right>
                            </Row>
                        ))}
                    </Column>
                </div>
                <div id="card-summary">
                    <Inner>
                        <H3 color="grey">Cost</H3>
                        <Column>
                            <Row style={{ width: "100%" }}>
                                <Left>Premium</Left>
                                <Right>$ {total ? total : "..."}</Right>
                            </Row>
                            <Row style={{ width: "100%" }}>
                                <Left>Gas</Left>
                                <Right>
                                    ${" "}
                                    {totalGasCost
                                        ? totalGasCost.toString().substr(0, 4)
                                        : "..."}{" "}
                                </Right>
                            </Row>
                            <Row style={{ width: "100%" }}>
                                <Left>Protocol</Left>
                                <Right>$1.00</Right>
                            </Row>
                            <Button
                                style={{
                                    margin: "4em",
                                    backgroundColor: "lightgreen",
                                    color: "black",
                                    borderColor: "lightgreen",
                                }}
                                onClick={() => submitOrder()}
                            >
                                Submit
                            </Button>
                        </Column>
                    </Inner>
                </div>
            </Card>
        </Wrapper>
    );
};

export default Cart;

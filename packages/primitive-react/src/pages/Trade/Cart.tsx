import React, { FunctionComponent /* useEffect, useState */ } from "react";
import styled from "styled-components";
import H1 from "../../components/H1";
import H2 from "../../components/H2";
import H3 from "../../components/H3";
import Button from "../../components/Button";

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

const Row = styled.div`
    display: flex;
    flex-direction: row;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
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

const Cart: FunctionComponent<any> = () => {
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
                        <Row style={{ width: "100%" }}>
                            <Left>100 ETH Call 8/7</Left>
                            <Right>$4.00</Right>
                        </Row>
                        <Row style={{ width: "100%" }}>
                            <Left>100 ETH Call 8/7</Left>
                            <Right>$4.00</Right>
                        </Row>
                        <Row style={{ width: "100%" }}>
                            <Left>100 ETH Call 8/7</Left>
                            <Right>$4.00</Right>
                        </Row>
                    </Column>
                </div>
                <div id="card-summary">
                    <Inner>
                        <H3 color="grey">Cost</H3>
                        <Column>
                            <Row style={{ width: "100%" }}>
                                <Left>Premium</Left>
                                <Right>$4.00</Right>
                            </Row>
                            <Row style={{ width: "100%" }}>
                                <Left>Gas</Left>
                                <Right>$2.00</Right>
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

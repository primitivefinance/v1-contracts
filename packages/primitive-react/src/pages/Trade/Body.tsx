import React, { FunctionComponent, useState } from "react";
import styled from "styled-components";
import Column from "../../components/Column";
import Row from "../../components/Row";
import H3 from "../../components/H3";
import H2 from "../../components/H2";
import Loading from "../../components/Loading";
import Button from "../../components/Button";
import Dropdown from "./Dropdown";

const BodyContainer = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
    width: calc(1248px + 16px * 2);
`;

const Body: FunctionComponent<any> = ({ update }) => {
    const [isBuy, setIsBuy] = useState<boolean>(true);
    const [isCall, setIsCall] = useState<boolean>(true);

    const handleBuyChange = (state) => {
        setIsBuy(state);
        update(isBuy, isCall);
    };

    const handleCallChange = (state) => {
        setIsCall(state);
        update(isBuy, isCall);
    };

    return (
        <BodyContainer id="trade:body/container">
            <Row style={{ width: "25%" }}>
                <Button selected={isBuy} onClick={() => handleBuyChange(true)}>
                    Buy
                </Button>
                <Button
                    selected={!isBuy}
                    onClick={() => handleBuyChange(false)}
                >
                    Sell
                </Button>
            </Row>
            <Row style={{ width: "25%" }}>
                <Button
                    selected={isCall}
                    onClick={() => handleCallChange(true)}
                >
                    Calls
                </Button>
                <Button
                    selected={!isCall}
                    onClick={() => handleCallChange(false)}
                >
                    Puts
                </Button>
            </Row>
            <Row style={{ width: "50%" }}>
                <Dropdown /* setExpiry={setExpiry} */ />
            </Row>
        </BodyContainer>
    );
};

export default Body;

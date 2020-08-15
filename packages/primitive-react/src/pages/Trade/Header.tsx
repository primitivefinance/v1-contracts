import React, { FunctionComponent, useContext } from "react";
import styled from "styled-components";
import Column from "../../components/Column";
import Row from "../../components/Row";
import H3 from "../../components/H3";
import H2 from "../../components/H2";
import Loading from "../../components/Loading";
import PriceContext from "./context/PriceContext";

const HeaderContainer = styled.div`
    display: flex;
    flex-direction: row;
    width: calc(1248px + 16px * 2);
`;

const Header: FunctionComponent<any> = () => {
    const { ethereum, isLoaded } = useContext(PriceContext);

    return (
        <HeaderContainer>
            <Column style={{ width: "25%" }}>
                <H2>Ether</H2>
                <H2>{!isLoaded ? <Loading /> : "$" + ethereum?.usd}</H2>
                <Row>
                    <H3 color="lightgreen">
                        {" "}
                        {!isLoaded ? (
                            <Loading />
                        ) : ethereum ? (
                            (ethereum?.usd_24h_change).toString().substr(0, 6) +
                            "%"
                        ) : (
                            <Loading />
                        )}
                    </H3>
                    <H3 color="grey">Today</H3>
                </Row>
            </Column>
        </HeaderContainer>
    );
};

export default Header;

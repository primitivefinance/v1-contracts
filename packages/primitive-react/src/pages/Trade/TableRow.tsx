import React, { FunctionComponent /* useEffect, useState */ } from "react";
import styled from "styled-components";
import H3 from "../../components/H3";
import Button from "../../components/Button";

const Row = styled.div`
    display: flex;
    flex-direction: row;
`;

const Add = styled(Button)`
    border-radius: 0px 8px 8px 0px;
    border-left: none;
    min-width: 2em;
    min-height: 1em;
    align-items: center;
    font-weight: 700;
    margin: 0;
    padding: 8px;
`;

const Cost = styled(Button)`
    border-radius: 8px 0px 0px 8px;
    min-width: 2em;
    min-height: 1em;
    align-items: center;
    font-weight: 500;
    margin: 0;
    padding: 8px;
`;

const TableRow: FunctionComponent<any> = ({ option, addToCart }) => {
    const tableItems = ["$400.00", "$250.00", "$1,000,00", "$230,000", "2.56%"];
    return (
        <div
            id="table-row"
            style={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
            }}
        >
            <Row style={{ width: "80%", borderBottom: "solid 0.1em darkgrey" }}>
                {tableItems.map((v) => (
                    <div
                        style={{
                            width: "100%",
                            height: "10vmin",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <H3
                            style={{
                                width: "20%",
                            }}
                        >
                            {v}
                        </H3>
                    </div>
                ))}
                <Row
                    style={{
                        width: "100%",
                        height: "10vmin",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Cost onClick={() => addToCart(option)}>$3.00</Cost>
                    <Add onClick={() => addToCart(option)}>+</Add>
                </Row>
            </Row>
        </div>
    );
};

export default TableRow;

import React, { FunctionComponent, useEffect, useState } from "react";
import styled from "styled-components";
import H3 from "../../components/H3";
import Button from "../../components/Button";
import { formatEther } from "ethers/utils";
import Loading from "../../components/Loading";
import Row from "../../components/Row";

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

const Item = styled.div`
    width: 100%;
    height: 10vmin;
    display: flex;
    align-items: center;
`;

const TableRow: FunctionComponent<any> = ({ option, addToCart, data }) => {
    const [tableItems, setTableItems] = useState<any>();

    useEffect(() => {
        let table = ["", "", "", "", "", ""];
        if (data) {
            let strike = data
                ? data.params
                    ? formatEther(data?.params?._quote)
                    : "..."
                : "...";
            let breakeven = data ? +data?.pair?.premium + +strike : "..";
            let openInterest = data
                ? formatEther(data?.pair?.openInterest)
                : "..";
            table = [
                `$ ${(+strike).toFixed(2)}`,
                `$ ${(+breakeven).toFixed(2)}`,
                `${(+openInterest).toFixed(2)}`,
                "$ ...",
                "... %",
            ];
            console.log(data);
        }
        setTableItems(table);
    }, [data]);

    console.log(data ? data : "loding data");
    return (
        <Row id="table-row">
            <Row style={{ width: "80%", borderBottom: "solid 0.1em darkgrey" }}>
                {tableItems ? (
                    tableItems.map((v, index) => (
                        <Item id={index}>
                            <H3>{v}</H3>
                        </Item>
                    ))
                ) : (
                    <Loading />
                )}
                <Item>
                    <Cost onClick={() => addToCart(option)}>
                        ${" "}
                        {data ? (data?.pair?.premium).toFixed(2) : <Loading />}
                    </Cost>
                    <Add onClick={() => addToCart(option)}>+</Add>
                </Item>
            </Row>
        </Row>
    );
};

export default TableRow;

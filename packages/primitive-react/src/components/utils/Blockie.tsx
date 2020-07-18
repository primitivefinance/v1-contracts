import React, { FunctionComponent } from "react";
import makeBlockie from "ethereum-blockies-base64";

interface BlockieProps {
    address: string;
}

export const Blockie: FunctionComponent<BlockieProps> = ({
    children,
    address,
}) => {
    return (
        <div style={{ display: "flex" }}>
            <img
                alt={"Your addresses generated blockie."}
                width="36rem"
                height="36rem"
                src={makeBlockie(address)}
            />
        </div>
    );
};

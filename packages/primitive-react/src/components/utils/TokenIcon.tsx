import React, { FunctionComponent } from "react";
import { ReactComponent as WETH } from "../../icons/wethtoken.svg";
import { ReactComponent as ETH } from "../../icons/ethtokenicon.svg";
import { ReactComponent as DAI } from "../../icons/daitokenicon.svg";
import { ReactComponent as PRIME } from "../../icons/primetoken.svg";
import { ReactComponent as REDEEM } from "../../icons/primeredeemtoken.svg";
import { ReactComponent as PULP } from "../../icons/primepulptoken.svg";

type TokenIconProps = {
    size: number;
    units?: string;
};

/**
 * @dev A wrapper box container to style the TextField component
 */
const TokenIcon: FunctionComponent<TokenIconProps> = ({ units, size }) => {
    return (
        <>
            {units === "tokenW" || units === "WETH" ? (
                <WETH
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : units === "ETH" ? (
                <ETH
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : units === "tokenP" ? (
                <PRIME
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : units === "DAI" ? (
                <DAI
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : units?.startsWith("prime") || units === "PRIME" ? (
                <PRIME
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : units?.startsWith("redeem") || units === "REDEEM" ? (
                <REDEEM
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : units?.startsWith("pulp") ? (
                <PULP
                    width={size}
                    height={size}
                    style={{ alignSelf: "center" }}
                />
            ) : (
                units
            )}
        </>
    );
};

export default TokenIcon;

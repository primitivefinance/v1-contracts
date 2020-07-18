import React, { FunctionComponent } from "react";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import FireplaceIcon from "@material-ui/icons/Fireplace";
import SwapHorizIcon from "@material-ui/icons/SwapHoriz";

type EventIconProps = {
    size: number;
    units?: string;
};

/**
 * @dev A wrapper box container to style the TextField component
 */
const EventIcon: FunctionComponent<EventIconProps> = ({ units, size }) => {
    return (
        <>
            {units === "Mint" ? (
                <AttachMoneyIcon width={size} height={size} />
            ) : units === "Redeem" ? (
                <FireplaceIcon width={size} height={size} />
            ) : units === "Close" ? (
                <FireplaceIcon width={size} height={size} />
            ) : units === "Swap" ? (
                <SwapHorizIcon width={size} height={size} />
            ) : (
                units
            )}
        </>
    );
};

export default EventIcon;

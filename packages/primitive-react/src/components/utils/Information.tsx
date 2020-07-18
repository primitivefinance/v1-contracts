import React, { FunctionComponent } from "react";
import HelpIcon from "@material-ui/icons/Help";
import Tooltip from "@material-ui/core/Tooltip";

export const Information: FunctionComponent = ({ children }) => {
    return (
        <Tooltip title={`${children}`}>
            <HelpIcon fontSize="inherit" aria-label={`${children}`}></HelpIcon>
        </Tooltip>
    );
};
